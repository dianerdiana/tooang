import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { PrismaClient } from '../generated/prisma/client';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Reviews API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let placeId: string;
  let menuItemId: string;
  let otherMenuItemId: string;
  let orderId: string;
  let secondOrderId: string;

  const suffix = randomUUID().replaceAll('-', '');
  const password = 'correct-horse-battery-staple';
  const userEmail = `review-user-${suffix}@example.com`;
  const adminEmail = `review-admin-${suffix}@example.com`;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_TOKEN = 'e2e-access-secret-with-at-least-32-bytes';
    process.env.JWT_REFRESH_TOKEN = 'e2e-refresh-secret-with-at-least-32-bytes';
    process.env.RATE_LIMIT_SOURCE_HMAC_SECRET = 'e2e-rate-limit-secret-with-32-bytes';
    process.env.JWT_ACCESS_TOKEN_EXPIRE ||= '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRE ||= '30d';
    process.env.JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE ||= '90d';
    process.env.BCRYPT_ROUNDS = '4';
    process.env.IMAGEKIT_ENABLED = 'false';

    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
    await prisma.authRateLimitBucket.deleteMany();
    const passwordHash = await bcrypt.hash(preHashPassword(password), 4);
    const user = await prisma.user.create({
      data: {
        userId: `usr_${suffix}`,
        fullName: 'Review Customer',
        email: userEmail,
        passwordHash,
      },
    });
    userId = user.id;
    const admin = await prisma.user.create({
      data: {
        userId: `usr_a${suffix}`,
        fullName: 'Review Administrator',
        email: adminEmail,
        passwordHash,
        platformRole: 'ADMIN',
      },
    });
    adminId = admin.id;
    const place = await prisma.place.create({
      data: {
        name: 'Review Cafe',
        slug: `review-cafe-${suffix}`,
        type: 'CAFE',
        address: 'Review street',
        timezone: 'UTC',
        isPublished: true,
      },
    });
    placeId = place.id;
    const categoryName = `Reviewed ${suffix}`;
    const category = await prisma.menuCategory.create({
      data: { placeId, name: categoryName, normalizedName: categoryName.toLowerCase() },
    });
    const item = await prisma.menuItem.create({
      data: { placeId, categoryId: category.id, name: 'Reviewed item', type: 'FOOD', price: 10 },
    });
    menuItemId = item.id;
    const otherItem = await prisma.menuItem.create({
      data: { placeId, categoryId: category.id, name: 'Other item', type: 'FOOD', price: 12 },
    });
    otherMenuItemId = otherItem.id;

    const createOrder = (code: string) =>
      prisma.order.create({
        data: {
          orderCode: code,
          userId,
          placeId,
          status: 'COMPLETED',
          statusUpdatedAt: new Date(),
          completedAt: new Date(),
          fulfillmentType: 'TAKEAWAY',
          customerName: 'Review Customer',
          subtotal: 10,
        },
      });
    orderId = (await createOrder(`TNG-20260915-${suffix.slice(0, 8).toUpperCase()}`)).id;
    secondOrderId = (await createOrder(`TNG-20260916-${suffix.slice(8, 16).toUpperCase()}`)).id;
    await prisma.orderItem.createMany({
      data: [orderId, secondOrderId].map((id) => ({
        orderId: id,
        menuItemId,
        itemName: 'Reviewed item',
        itemType: 'FOOD' as const,
        unitPrice: 10,
        quantity: 1,
        lineTotal: 10,
      })),
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;

    const userLogin = await request(server).post('/api/v1/auth/login').send({
      email: userEmail,
      password,
    });
    userToken = (userLogin.body as { data: { accessToken: string } }).data.accessToken;
    const adminLogin = await request(server).post('/api/v1/auth/login').send({
      email: adminEmail,
      password,
    });
    adminToken = (adminLogin.body as { data: { accessToken: string } }).data.accessToken;
  });

  afterAll(async () => {
    if (adminId) await prisma.auditLog.deleteMany({ where: { actorUserId: adminId } });
    if (placeId) await prisma.order.deleteMany({ where: { placeId } });
    if (placeId) await prisma.place.deleteMany({ where: { id: placeId } });
    if (userId || adminId) {
      await prisma.user.deleteMany({ where: { id: { in: [userId, adminId].filter(Boolean) } } });
    }
    await app?.close();
    await prisma?.$disconnect();
  });

  it('creates, updates, soft-deletes, restores, and publicly summarizes a place review', async () => {
    await request(server)
      .post(`/api/v1/places/${placeId}/reviews`)
      .send({ orderId, rating: 5 })
      .expect(401);

    const created = await request(server)
      .post(`/api/v1/places/${placeId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId, rating: 5, comment: '  Great place  ' })
      .expect(201);
    const reviewId = (created.body as { data: { review: { reviewId: string } } }).data.review
      .reviewId;

    await request(server)
      .patch(`/api/v1/me/place-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ rating: 4 })
      .expect(200);

    const visible = await request(server).get(`/api/v1/places/${placeId}/reviews`).expect(200);
    expect(visible.body).toMatchObject({
      data: { summary: { reviewCount: 1, averageRating: 4 } },
      meta: { totalItems: 1 },
    });

    await request(server)
      .delete(`/api/v1/me/place-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    const hidden = await request(server).get(`/api/v1/places/${placeId}/reviews`).expect(200);
    expect(hidden.body).toMatchObject({
      data: { reviews: [], summary: { reviewCount: 0, averageRating: null } },
    });

    const restored = await request(server)
      .post(`/api/v1/places/${placeId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId, rating: 3, comment: null })
      .expect(200);
    expect(restored.body).toMatchObject({ data: { review: { reviewId, rating: 3 } } });

    await request(server)
      .post(`/api/v1/places/${placeId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId: secondOrderId, rating: 5 })
      .expect(201);
  });

  it('requires the ordered item and supports audited moderation', async () => {
    const rejected = await request(server)
      .post(`/api/v1/places/${placeId}/menu-items/${otherMenuItemId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId, rating: 4 })
      .expect(409);
    expect((rejected.body as { code: string }).code).toBe('REVIEW_ITEM_NOT_IN_ORDER');

    const created = await request(server)
      .post(`/api/v1/places/${placeId}/menu-items/${menuItemId}/reviews`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ orderId, rating: 5 })
      .expect(201);
    const reviewId = (created.body as { data: { review: { reviewId: string } } }).data.review
      .reviewId;

    await request(server)
      .delete(`/api/v1/menu-item-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    await request(server)
      .delete(`/api/v1/menu-item-reviews/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const publicResult = await request(server)
      .get(`/api/v1/places/${placeId}/menu-items/${menuItemId}/reviews`)
      .expect(200);
    expect(publicResult.body).toMatchObject({
      data: { reviews: [], summary: { reviewCount: 0, averageRating: null } },
    });
    const audit = await prisma.auditLog.findFirst({
      where: { actorUserId: adminId, action: 'REVIEW_MODERATED', targetId: reviewId },
    });
    expect(audit).toMatchObject({ targetType: 'MenuItemReview', beforeData: { deletedAt: null } });
    expect(JSON.stringify(audit)).not.toContain('comment');
  });
});
