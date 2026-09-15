import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { PrismaClient } from '../generated/prisma/client';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service';
import { generateOrderCode } from '../src/modules/orders/checkout-identity';
import { OrderExpiryService } from '../src/modules/orders/order-expiry.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Order retrieval and lifecycle API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let customerId: string;
  let ownerId: string;
  let cashierId: string;
  let outsiderId: string;
  let adminId: string;
  let placeId: string;
  let otherPlaceId: string;
  let customerToken: string;
  let ownerToken: string;
  let cashierToken: string;
  let outsiderToken: string;
  let adminToken: string;

  const suffix = randomUUID().replaceAll('-', '');
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_TOKEN = 'e2e-access-secret-with-at-least-32-bytes';
    process.env.JWT_REFRESH_TOKEN = 'e2e-refresh-secret-with-at-least-32-bytes';
    process.env.RATE_LIMIT_SOURCE_HMAC_SECRET = 'e2e-rate-limit-secret-with-32-bytes';
    process.env.JWT_ACCESS_TOKEN_EXPIRE = '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRE = '30d';
    process.env.JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE = '90d';
    process.env.BCRYPT_ROUNDS = '4';
    process.env.IMAGEKIT_ENABLED = 'false';

    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
    const passwordHash = await bcrypt.hash(preHashPassword(password), 4);
    const [customer, owner, cashier, outsider, admin] = await Promise.all(
      [
        ['customer', 'USER'],
        ['owner', 'USER'],
        ['cashier', 'USER'],
        ['outsider', 'USER'],
        ['admin', 'ADMIN'],
      ].map(([name, platformRole]) =>
        prisma.user.create({
          data: {
            userId: `usr_${name}_${suffix}`,
            fullName: `${name} lifecycle`,
            email: `${name}-${suffix}@example.com`,
            passwordHash,
            platformRole: platformRole as 'USER' | 'ADMIN',
          },
        }),
      ),
    );
    customerId = customer.id;
    ownerId = owner.id;
    cashierId = cashier.id;
    outsiderId = outsider.id;
    adminId = admin.id;

    const [place, otherPlace] = await Promise.all([
      prisma.place.create({
        data: {
          name: 'Lifecycle Place',
          slug: `lifecycle-${suffix}`,
          type: 'RESTAURANT',
          address: 'Lifecycle address',
          timezone: 'UTC',
        },
      }),
      prisma.place.create({
        data: {
          name: 'Foreign Lifecycle Place',
          slug: `foreign-lifecycle-${suffix}`,
          type: 'RESTAURANT',
          address: 'Foreign address',
          timezone: 'UTC',
        },
      }),
    ]);
    placeId = place.id;
    otherPlaceId = otherPlace.id;
    await prisma.placeMember.createMany({
      data: [
        { placeId, userId: owner.id, role: 'OWNER' },
        { placeId, userId: cashier.id, role: 'CASHIER' },
        { placeId: otherPlaceId, userId: outsider.id, role: 'OWNER' },
      ],
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;

    async function login(email: string) {
      const response = await request(server).post('/api/v1/auth/login').send({ email, password });
      return (response.body as { data: { accessToken: string } }).data.accessToken;
    }
    [customerToken, ownerToken, cashierToken, outsiderToken, adminToken] = await Promise.all([
      login(customer.email),
      login(owner.email),
      login(cashier.email),
      login(outsider.email),
      login(admin.email),
    ]);
  });

  afterAll(async () => {
    const actorIds = [customerId, ownerId, cashierId, outsiderId, adminId].filter(Boolean);
    if (actorIds.length)
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: actorIds } } });
    if (placeId || otherPlaceId) {
      await prisma.order.deleteMany({
        where: { placeId: { in: [placeId, otherPlaceId].filter(Boolean) } },
      });
      await prisma.place.deleteMany({
        where: { id: { in: [placeId, otherPlaceId].filter(Boolean) } },
      });
    }
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@example.com` } } });
    await app?.close();
    await prisma?.$disconnect();
  });

  async function createOrder(options: { expired?: boolean; disabled?: boolean } = {}) {
    const createdAt = options.expired
      ? new Date(Date.now() - 16 * 60_000)
      : new Date(Date.now() - 60_000);
    return prisma.order.create({
      data: {
        orderCode: generateOrderCode(new Date()),
        verificationToken: randomBytes(32).toString('base64url'),
        userId: customerId,
        placeId,
        status: 'PENDING',
        statusUpdatedAt: createdAt,
        fulfillmentType: 'TAKEAWAY',
        customerName: 'Lifecycle Customer',
        subtotal: '12500.00',
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 15 * 60_000),
        verificationDisabledAt: options.disabled ? new Date() : null,
        items: {
          create: {
            itemName: 'Snapshot Item',
            itemType: 'FOOD',
            unitPrice: '12500.00',
            quantity: 1,
            lineTotal: '12500.00',
          },
        },
      },
    });
  }

  it('isolates own, place, foreign-tenant, and global reads', async () => {
    const order = await createOrder();
    const own = await request(server)
      .get(`/api/v1/me/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const ownBody = own.body as { data: { order: { orderId: string; subtotal: number } } };
    expect(ownBody.data.order).toMatchObject({ orderId: order.id, subtotal: 12500 });
    expect(JSON.stringify(own.body)).not.toContain(order.verificationToken);

    const ownList = await request(server)
      .get(`/api/v1/me/orders?status=PENDING&placeId=${placeId}&limit=1`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      ownList.body as { data: { orders: Array<{ orderId: string }> }; meta: { limit: number } },
    ).toMatchObject({ data: { orders: [{ orderId: order.id }] }, meta: { limit: 1 } });

    await request(server)
      .get(`/api/v1/places/${placeId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    await request(server)
      .get(`/api/v1/places/${placeId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(200);
    await request(server)
      .get(`/api/v1/places/${placeId}/orders/by-code/${order.orderCode.toLowerCase()}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    await request(server)
      .get(`/api/v1/places/${placeId}/orders/${order.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(404);
    await request(server)
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await request(server)
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('authorizes operational transitions and enforces cancellation reasons', async () => {
    const order = await createOrder();
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(404);
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(404);
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ status: 'CONFIRMED' })
      .expect(200);
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(400);
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'CANCELLED', cancellationReason: ' Kitchen closed ' })
      .expect(200);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(stored).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Kitchen closed' });
    expect(stored.confirmedAt).not.toBeNull();
    expect(stored.cancelledAt).not.toBeNull();

    const adminOrder = await createOrder();
    await request(server)
      .patch(`/api/v1/places/${placeId}/orders/${adminOrder.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);
  });

  it('returns only minimal public verification data and hides unusable tokens', async () => {
    const order = await createOrder();
    const response = await request(server)
      .get(`/api/v1/order-verifications/${order.verificationToken}`)
      .expect(200);
    const verificationBody = response.body as {
      data: { orderVerification: Record<string, unknown> };
    };
    expect(Object.keys(verificationBody.data.orderVerification).sort()).toEqual(
      [
        'orderCode',
        'placeName',
        'status',
        'fulfillmentType',
        'createdAt',
        'expiresAt',
        'statusUpdatedAt',
      ].sort(),
    );
    expect(JSON.stringify(response.body)).not.toContain(order.verificationToken);

    const disabled = await createOrder({ disabled: true });
    const unknown = randomBytes(32).toString('base64url');
    const disabledResponse = await request(server)
      .get(`/api/v1/order-verifications/${disabled.verificationToken}`)
      .expect(404);
    const retentionExpired = await createOrder();
    const terminalAt = new Date(Date.now() - 31 * 24 * 60 * 60_000);
    await prisma.order.update({
      where: { id: retentionExpired.id },
      data: { status: 'COMPLETED', completedAt: terminalAt, statusUpdatedAt: terminalAt },
    });
    const retentionResponse = await request(server)
      .get(`/api/v1/order-verifications/${retentionExpired.verificationToken}`)
      .expect(404);
    const unknownResponse = await request(server)
      .get(`/api/v1/order-verifications/${unknown}`)
      .expect(404);
    expect(disabledResponse.body).toEqual(unknownResponse.body);
    expect(retentionResponse.body).toEqual(unknownResponse.body);
  });

  it('rejects expired PENDING mutations before materializing expiry idempotently', async () => {
    const order = await createOrder({ expired: true });
    const rejection = await request(server)
      .patch(`/api/v1/me/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'CANCELLED' })
      .expect(409);
    expect((rejection.body as { code: string }).code).toBe('ORDER_PENDING_EXPIRED');

    const expiry = app.get(OrderExpiryService);
    await expiry.runCycle();
    await expiry.runCycle();
    expect(await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({
      status: 'EXPIRED',
    });
  });

  it('allows at most one concurrent transition from an expected status', async () => {
    const order = await createOrder();
    const [confirm, cancel] = await Promise.all([
      request(server)
        .patch(`/api/v1/places/${placeId}/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'CONFIRMED' }),
      request(server)
        .patch(`/api/v1/me/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'CANCELLED' }),
    ]);
    expect([confirm.status, cancel.status].sort()).toEqual([200, 409]);
    expect(
      await prisma.auditLog.count({
        where: { targetType: 'Order', targetId: order.id, action: 'ORDER_STATUS_UPDATED' },
      }),
    ).toBe(1);
  });
});
