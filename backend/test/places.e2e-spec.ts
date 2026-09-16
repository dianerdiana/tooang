import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { PlatformRole, PrismaClient } from '../generated/prisma/client';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Places API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  let accessToken: string;
  let actorId: string;
  let placeId: string;

  const suffix = randomUUID().replaceAll('-', '');
  const email = `places-${suffix}@example.com`;
  const slug = `places-${suffix}`;
  const password = 'correct-horse-battery-staple';

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

    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
    await prisma.authRateLimitBucket.deleteMany();
    const user = await prisma.user.create({
      data: {
        userId: `usr_${suffix}`,
        fullName: 'Places E2E Administrator',
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

  it('creates, configures, publishes, discovers, and soft-deletes a place', async () => {
    const created = await request(server)
      .post('/api/v1/places')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Discovery Cafe',
        slug,
        type: 'CAFE',
        address: 'Jalan Test 1',
        city: 'Bandung',
        timezone: 'Asia/Jakarta',
      })
      .expect(201);
    placeId = (created.body as { data: { place: { id: string } } }).data.place.id;

    await request(server).get(`/api/v1/places/${slug}`).expect(404);

    await request(server)
      .put(`/api/v1/places/${placeId}/business-hours/MONDAY`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isClosed: false, opensAt: '08:00', closesAt: '17:00' })
      .expect(200);

    await request(server)
      .post(`/api/v1/places/${placeId}/dining-tables`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: ' Main   Hall ' })
      .expect(201);
    await request(server)
      .post(`/api/v1/places/${placeId}/dining-tables`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'main hall' })
      .expect(409);

    const category = await prisma.menuCategory.create({
      data: { placeId, name: 'Food', normalizedName: 'food' },
    });
    await prisma.menuItem.create({
      data: {
        placeId,
        categoryId: category.id,
        name: 'Noodles',
        type: 'FOOD',
        price: 20_000,
        isAvailable: true,
      },
    });

    await request(server)
      .patch(`/api/v1/places/${placeId}/publishing`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isPublished: true })
      .expect(200);
    await request(server)
      .patch(`/api/v1/places/${placeId}/ordering`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isOrderingEnabled: true })
      .expect(200);

    const list = await request(server)
      .get('/api/v1/places')
      .query({ city: 'bandung', search: 'discovery', limit: 1 })
      .expect(200);
    expect((list.body as { data: { places: unknown[] } }).data.places).toHaveLength(1);

    const detail = await request(server).get(`/api/v1/places/${slug}`).expect(200);
    const publicPlace = (detail.body as { data: { place: Record<string, unknown> } }).data.place;
    expect(publicPlace).toMatchObject({ slug, isPublished: true, isOrderingEnabled: true });
    expect(publicPlace.businessHours).toBeInstanceOf(Array);
    expect(publicPlace).not.toHaveProperty('deletedAt');
    expect(publicPlace).not.toHaveProperty('logoAssetId');

    await request(server)
      .delete(`/api/v1/places/${placeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    await request(server).get(`/api/v1/places/${slug}`).expect(404);
  });
});
