import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { PlatformRole, PrismaClient } from '../generated/prisma/client';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Menus API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let accessToken: string;
  let actorId: string;
  let placeId: string;
  const suffix = randomUUID().replaceAll('-', '');
  const email = `menus-${suffix}@example.com`;
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
    const user = await prisma.user.create({
      data: {
        userId: `usr_${suffix}`,
        fullName: 'Menus E2E Administrator',
        email,
        passwordHash: await bcrypt.hash(preHashPassword(password), 4),
        platformRole: PlatformRole.SUPER_ADMIN,
      },
    });
    actorId = user.id;
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
    if (placeId) await prisma.place.deleteMany({ where: { id: placeId } });
    if (actorId) {
      await prisma.auditLog.deleteMany({ where: { actorUserId: actorId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
    }
    await app?.close();
    await prisma?.$disconnect();
  });

  it('manages scoped menu content and exposes only eligible grouped public items', async () => {
    const place = await request(server)
      .post('/api/v1/places')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Menus Cafe',
        slug: `menus-${suffix}`,
        type: 'CAFE',
        address: 'Test address',
        timezone: 'Asia/Jakarta',
      })
      .expect(201);
    placeId = (place.body as { data: { place: { id: string } } }).data.place.id;

    const category = await request(server)
      .post(`/api/v1/places/${placeId}/menu-categories`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Hot   Food ' })
      .expect(201);
    const categoryId = (category.body as { data: { category: { categoryId: string } } }).data
      .category.categoryId;
    await request(server)
      .post(`/api/v1/places/${placeId}/menu-categories`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'hot food' })
      .expect(409);

    const item = await request(server)
      .post(`/api/v1/places/${placeId}/menu-items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ categoryId, name: 'Noodles', type: 'FOOD', price: 15000.25 })
      .expect(201);
    const menuItemId = (item.body as { data: { menuItem: { menuItemId: string } } }).data.menuItem
      .menuItemId;

    await request(server)
      .patch(`/api/v1/places/${placeId}/publishing`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isPublished: true })
      .expect(200);
    const menu = await request(server).get(`/api/v1/places/${placeId}/menu`).expect(200);
    const body = menu.body as {
      data: { categories: Array<{ categoryId: string; name: string; items: unknown[] }> };
      meta: { totalItems: number };
    };
    expect(body).toEqual(
      expect.objectContaining({
        data: {
          categories: [
            expect.objectContaining({
              categoryId,
              name: 'Hot Food',
              items: [expect.objectContaining({ menuItemId, price: 15000.25, imageUrl: null })],
            }),
          ],
        },
      }),
    );
    expect(body.meta.totalItems).toBe(1);

    await request(server)
      .delete(`/api/v1/places/${placeId}/menu-items/${menuItemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(server).get(`/api/v1/places/${placeId}/menu`).expect(404);
  });

  it('returns a sanitized 503 while media is disabled in test', async () => {
    await request(server)
      .post('/api/v1/media/upload-intents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        target: 'PLACE_LOGO',
        placeId,
        mimeType: 'image/png',
        sizeBytes: 100,
      })
      .expect(503);
  });
});
