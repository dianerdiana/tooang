import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { DayOfWeek, PrismaClient } from '../generated/prisma/client';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Carts and checkout API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let accessToken: string;
  let userId: string;
  let placeId: string;
  let menuItemId: string;
  let tableId: string;
  const suffix = randomUUID().replaceAll('-', '');
  const email = `cart-order-${suffix}@example.com`;
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
    await prisma.authRateLimitBucket.deleteMany();
    const user = await prisma.user.create({
      data: {
        userId: `usr_${suffix}`,
        fullName: 'Cart Order User',
        email,
        passwordHash: await bcrypt.hash(preHashPassword(password), 4),
      },
    });
    userId = user.id;
    const place = await prisma.place.create({
      data: {
        name: 'Always Open Test Place',
        slug: `cart-order-${suffix}`,
        type: 'RESTAURANT',
        address: 'Test address',
        timezone: 'UTC',
        isPublished: true,
        isOrderingEnabled: true,
      },
    });
    placeId = place.id;
    await prisma.businessHour.createMany({
      data: Object.values(DayOfWeek).map((day) => ({
        placeId,
        day,
        opensAt: new Date('1970-01-01T00:00:01.000Z'),
        closesAt: new Date('1970-01-01T23:59:59.000Z'),
        isClosed: false,
      })),
    });
    const category = await prisma.menuCategory.create({
      data: { placeId, name: 'Checkout', normalizedName: 'checkout' },
    });
    const item = await prisma.menuItem.create({
      data: {
        placeId,
        categoryId: category.id,
        name: 'Noodles',
        type: 'FOOD',
        price: '15000.25',
      },
    });
    menuItemId = item.id;
    const table = await prisma.diningTable.create({
      data: { placeId, name: 'Table 7', normalizedName: 'table 7' },
    });
    tableId = table.id;

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;
    const login = await request(server).post('/api/v1/auth/login').send({ email, password });
    accessToken = (login.body as { data: { accessToken: string } }).data.accessToken;
  });

  afterAll(async () => {
    if (userId) await prisma.idempotencyKey.deleteMany({ where: { userId } });
    if (placeId) await prisma.order.deleteMany({ where: { placeId } });
    if (placeId) await prisma.place.deleteMany({ where: { id: placeId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await app?.close();
    await prisma?.$disconnect();
  });

  it('increments cart quantities, reads current prices, and checks out exactly once', async () => {
    const authorization = `Bearer ${accessToken}`;
    await request(server)
      .post(`/api/v1/me/carts/${placeId}/items`)
      .set('Authorization', authorization)
      .send({ menuItemId, quantity: 2, note: '  Less salt  ' })
      .expect(200);
    const incremented = await request(server)
      .post(`/api/v1/me/carts/${placeId}/items`)
      .set('Authorization', authorization)
      .send({ menuItemId, quantity: 3 })
      .expect(200);
    const incrementedBody = incremented.body as { data: { cart: unknown } };
    expect(incrementedBody.data.cart).toMatchObject({
      distinctItemCount: 1,
      aggregateQuantity: 5,
      items: [{ menuItemId, quantity: 5, note: 'Less salt', unitPrice: 15000.25 }],
    });

    await prisma.menuItem.update({ where: { id: menuItemId }, data: { price: '16000.50' } });
    const current = await request(server)
      .get(`/api/v1/me/carts/${placeId}`)
      .set('Authorization', authorization)
      .expect(200);
    const currentBody = current.body as { data: { cart: { items: unknown[] } } };
    expect(currentBody.data.cart.items[0]).toMatchObject({ unitPrice: 16000.5 });

    const key = `checkout-${suffix}`;
    const rawBody = {
      placeId: placeId.toUpperCase(),
      fulfillmentType: 'DINE_IN',
      customerName: '  Ayu   Lestari ',
      customerNote: ' No peanuts\r\nplease ',
      tableId: tableId.toUpperCase(),
    };
    const created = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', key)
      .send(rawBody)
      .expect(201);
    const createdBody = created.body as { data: { order: unknown } };
    expect(createdBody.data.order).toMatchObject({
      placeId,
      status: 'PENDING',
      fulfillmentType: 'DINE_IN',
      customerName: 'Ayu Lestari',
      customerNote: 'No peanuts\nplease',
      diningTable: { tableId, name: 'Table 7' },
      subtotal: 80002.5,
      items: [
        {
          menuItemId,
          itemName: 'Noodles',
          unitPrice: 16000.5,
          quantity: 5,
          lineTotal: 80002.5,
        },
      ],
    });
    expect(JSON.stringify(created.body)).not.toContain('verificationToken');

    const replayed = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', key)
      .send({
        placeId,
        fulfillmentType: 'DINE_IN',
        customerName: 'Ayu Lestari',
        customerNote: 'No peanuts\nplease',
        tableId,
      })
      .expect(201);
    expect(replayed.body).toEqual(created.body);

    await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', key)
      .send({ placeId, fulfillmentType: 'TAKEAWAY', customerName: 'Ayu Lestari' })
      .expect(409);

    expect(await prisma.order.count({ where: { userId, placeId } })).toBe(1);
    expect(await prisma.idempotencyKey.count({ where: { userId, key } })).toBe(1);
    expect(await prisma.cartItem.count({ where: { cart: { userId, placeId } } })).toBe(0);
    const storedOrder = await prisma.order.findFirstOrThrow({
      where: { userId, placeId },
      include: { items: true },
    });
    expect(storedOrder.expiresAt.getTime() - storedOrder.createdAt.getTime()).toBe(15 * 60_000);
    expect(storedOrder.items[0]).toMatchObject({ itemName: 'Noodles', quantity: 5 });
    expect(storedOrder.items[0].unitPrice.toFixed(2)).toBe('16000.50');
  });

  it('preserves rejected carts and removes invalid items only during cart retrieval', async () => {
    const authorization = `Bearer ${accessToken}`;
    await request(server)
      .post(`/api/v1/me/carts/${placeId}/items`)
      .set('Authorization', authorization)
      .send({ menuItemId })
      .expect(200);
    await prisma.menuItem.update({ where: { id: menuItemId }, data: { isAvailable: false } });

    await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', `invalid-${suffix}`)
      .send({ placeId, fulfillmentType: 'TAKEAWAY', customerName: 'Budi' })
      .expect(409);
    expect(await prisma.cartItem.count({ where: { cart: { userId, placeId } } })).toBe(1);
    expect(await prisma.idempotencyKey.count({ where: { userId, key: `invalid-${suffix}` } })).toBe(
      0,
    );

    const reconciled = await request(server)
      .get(`/api/v1/me/carts/${placeId}`)
      .set('Authorization', authorization)
      .expect(200);
    const reconciledBody = reconciled.body as { data: { cart: unknown } };
    expect(reconciledBody.data.cart).toMatchObject({
      distinctItemCount: 0,
      aggregateQuantity: 0,
      removedItems: [{ menuItemId, reason: 'ITEM_UNAVAILABLE' }],
    });
    expect(await prisma.cartItem.count({ where: { cart: { userId, placeId } } })).toBe(0);
  });

  it('serializes simultaneous equivalent requests and creates one order', async () => {
    const authorization = `Bearer ${accessToken}`;
    await prisma.menuItem.update({ where: { id: menuItemId }, data: { isAvailable: true } });
    await request(server)
      .post(`/api/v1/me/carts/${placeId}/items`)
      .set('Authorization', authorization)
      .send({ menuItemId, quantity: 2 })
      .expect(200);
    const before = await prisma.order.count({ where: { userId, placeId } });
    const key = `concurrent-${suffix}`;
    const checkout = () =>
      request(server)
        .post('/api/v1/me/orders')
        .set('Authorization', authorization)
        .set('Idempotency-Key', key)
        .send({ placeId, fulfillmentType: 'TAKEAWAY', customerName: 'Concurrent User' });

    const [first, second] = await Promise.all([checkout(), checkout()]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(await prisma.order.count({ where: { userId, placeId } })).toBe(before + 1);
    expect(await prisma.idempotencyKey.count({ where: { userId, key } })).toBe(1);
  });

  it('lazily replaces an expired idempotency record', async () => {
    const authorization = `Bearer ${accessToken}`;
    await request(server)
      .post(`/api/v1/me/carts/${placeId}/items`)
      .set('Authorization', authorization)
      .send({ menuItemId })
      .expect(200);
    const key = `expired-${suffix}`;
    const createdAt = new Date(Date.now() - 25 * 60 * 60_000);
    await prisma.idempotencyKey.create({
      data: {
        userId,
        endpoint: '/api/v1/me/orders',
        key,
        requestHash: 'expired',
        responseStatus: 201,
        responseBody: { stale: true },
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60_000),
      },
    });

    const response = await request(server)
      .post('/api/v1/me/orders')
      .set('Authorization', authorization)
      .set('Idempotency-Key', key)
      .send({ placeId, fulfillmentType: 'TAKEAWAY', customerName: 'Fresh Request' })
      .expect(201);
    expect(response.body).not.toEqual({ stale: true });
    const replacement = await prisma.idempotencyKey.findUniqueOrThrow({
      where: { userId_endpoint_key: { userId, endpoint: '/api/v1/me/orders', key } },
    });
    expect(replacement.requestHash).not.toBe('expired');
    expect(replacement.createdAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });
});
