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

type ApiBody = {
  data: {
    accessToken: string;
    user: Record<string, unknown> & { userId: string; email: string; platformRole: string };
    deletedAt: string;
  };
  meta: { totalItems: number };
};

describeDatabase('Authentication and users API (PostgreSQL E2E)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaClient;
  const membershipPlaceIds: string[] = [];
  const runId = randomUUID().replaceAll('-', '');
  const userEmail = `user-${runId}@example.com`;
  const updatedEmail = `updated-${runId}@example.com`;
  const adminEmail = `admin-${runId}@example.com`;
  const superAdminEmail = `super-${runId}@example.com`;
  const pendingEmail = `pending-${runId}@example.com`;
  const concurrentEmail = `concurrent-${runId}@example.com`;
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
    const passwordHash = await bcrypt.hash(preHashPassword(password), 4);
    await prisma.user.createMany({
      data: [
        {
          userId: `usr_${randomUUID().replaceAll('-', '')}`,
          fullName: 'E2E Administrator',
          email: adminEmail,
          passwordHash,
          platformRole: PlatformRole.ADMIN,
        },
        {
          userId: `usr_${randomUUID().replaceAll('-', '')}`,
          fullName: 'E2E Super Administrator',
          email: superAdminEmail,
          passwordHash,
          platformRole: PlatformRole.SUPER_ADMIN,
        },
      ],
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      const users = await prisma.user.findMany({
        where: {
          email: {
            in: [
              userEmail,
              updatedEmail,
              adminEmail,
              superAdminEmail,
              pendingEmail,
              concurrentEmail,
            ],
          },
        },
        select: { id: true },
      });
      const ids = users.map(({ id }) => id);
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
      await prisma.refreshSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.placeMember.deleteMany({ where: { userId: { in: ids } } });
      await prisma.place.deleteMany({ where: { id: { in: membershipPlaceIds } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.authRateLimitBucket.deleteMany();
      await prisma.$disconnect();
    }
  });

  it('implements cookie authentication and current-user profile flows', async () => {
    const registration = await request(server).post('/api/v1/auth/register').send({
      fullName: 'E2E User',
      email: userEmail.toUpperCase(),
      password,
    });
    expect(registration.status).toBe(201);
    const registrationBody = registration.body as ApiBody;
    expect(registrationBody.data.user.email).toBe(userEmail);
    expect(registrationBody.data.user.platformRole).toBe('USER');
    expect(registrationBody.data).not.toHaveProperty('accessToken');
    expect(registrationBody.data.user).not.toHaveProperty('passwordHash');

    await request(server)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Duplicate', email: userEmail, password })
      .expect(409);

    const agent = request.agent(server);
    const login = await agent.post('/api/v1/auth/login').send({ email: userEmail, password });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie']).toBeDefined();
    expect(String(login.headers['set-cookie'])).toContain('HttpOnly');
    expect(String(login.headers['set-cookie'])).toContain('SameSite=Lax');
    expect(String(login.headers['set-cookie'])).toContain('Path=/api/v1/auth');
    expect(String(login.headers['set-cookie'])).not.toContain('Secure');
    const originalAccessToken = (login.body as ApiBody).data.accessToken;
    const accessPayload = JSON.parse(
      Buffer.from(originalAccessToken.split('.')[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    expect(accessPayload).toMatchObject({ tokenType: 'access' });
    expect(accessPayload).not.toHaveProperty('platformRole');
    expect(accessPayload).not.toHaveProperty('roles');
    expect(accessPayload).not.toHaveProperty('permissions');

    const refresh = await agent.post('/api/v1/auth/refresh');
    expect(refresh.status).toBe(200);
    const accessToken = (refresh.body as ApiBody).data.accessToken;
    expect(accessToken).not.toBe(originalAccessToken);

    await request(server).get('/api/v1/me').expect(401);
    const me = await request(server).get('/api/v1/me').auth(accessToken, { type: 'bearer' });
    expect(me.status).toBe(200);
    expect((me.body as ApiBody).data.user.email).toBe(userEmail);
    expect((me.body as ApiBody).data.user).toHaveProperty('permissions');

    const update = await request(server)
      .patch('/api/v1/me')
      .auth(accessToken, { type: 'bearer' })
      .send({ fullName: 'Updated E2E User', email: updatedEmail.toUpperCase() });
    expect(update.status).toBe(200);
    expect((update.body as ApiBody).data.user.email).toBe(updatedEmail);

    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.post('/api/v1/auth/refresh').expect(401);
  });

  it('revokes the whole family when the same refresh token is submitted concurrently', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Concurrent Refresh User', email: concurrentEmail, password })
      .expect(201);
    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: concurrentEmail, password })
      .expect(200);
    const originalCookie = String(login.headers['set-cookie']).split(';')[0];

    const results = await Promise.all([
      request(server).post('/api/v1/auth/refresh').set('Cookie', originalCookie),
      request(server).post('/api/v1/auth/refresh').set('Cookie', originalCookie),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([200, 401]);

    const successful = results.find(({ status }) => status === 200)!;
    const successorCookie = String(successful.headers['set-cookie']).split(';')[0];
    await request(server).post('/api/v1/auth/refresh').set('Cookie', successorCookie).expect(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: concurrentEmail } });
    const sessions = await prisma.refreshSession.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(2);
    expect(sessions.every(({ revokedAt }) => revokedAt !== null)).toBe(true);
  });

  it('blocks the existing access and refresh tokens after a deletion request', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({ fullName: 'Pending Deletion User', email: pendingEmail, password })
      .expect(201);

    const agent = request.agent(server);
    const login = await agent.post('/api/v1/auth/login').send({ email: pendingEmail, password });
    const accessToken = (login.body as ApiBody).data.accessToken;

    await request(server)
      .post('/api/v1/me/account-deletion-requests')
      .auth(accessToken, { type: 'bearer' })
      .expect(202);

    await request(server).get('/api/v1/me').auth(accessToken, { type: 'bearer' }).expect(401);
    await agent.post('/api/v1/auth/refresh').expect(401);
  });

  it('enforces ADMIN and SUPER_ADMIN user-administration boundaries', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: updatedEmail } });
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const superUser = await prisma.user.findUniqueOrThrow({ where: { email: superAdminEmail } });
    const userLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: updatedEmail, password });
    const userToken = (userLogin.body as ApiBody).data.accessToken;
    await request(server)
      .get('/api/v1/users')
      .auth(userToken, { type: 'bearer' })
      .set('x-platform-role', 'SUPER_ADMIN')
      .set('x-permissions', 'user.read')
      .expect(403);

    const place = await prisma.place.create({
      data: {
        name: 'Authorization E2E Place',
        slug: `authorization-${runId}`,
        type: 'CAFE',
        address: 'Test address',
        timezone: 'Asia/Jakarta',
        members: { create: { userId: target.id, role: 'OWNER' } },
      },
    });
    membershipPlaceIds.push(place.id);
    const foreignPlace = await prisma.place.create({
      data: {
        name: 'Foreign Authorization Place',
        slug: `foreign-authorization-${runId}`,
        type: 'CAFE',
        address: 'Other test address',
        timezone: 'Asia/Jakarta',
        members: { create: { userId: superUser.id, role: 'OWNER' } },
      },
    });
    membershipPlaceIds.push(foreignPlace.id);
    await request(server)
      .get(`/api/v1/places/${foreignPlace.id}/members`)
      .auth(userToken, { type: 'bearer' })
      .expect(404);
    const meWithMembership = await request(server)
      .get('/api/v1/me')
      .auth(userToken, { type: 'bearer' });
    expect(
      (meWithMembership.body as ApiBody).data.user.placeMemberships as Array<{ placeId: string }>,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ placeId: place.id })]));
    await request(server)
      .get(`/api/v1/places/${place.id}/members`)
      .auth(userToken, { type: 'bearer' })
      .expect(200);
    await prisma.placeMember.update({
      where: { placeId_userId: { placeId: place.id, userId: target.id } },
      data: { revokedAt: new Date() },
    });
    const meAfterRevocation = await request(server)
      .get('/api/v1/me')
      .auth(userToken, { type: 'bearer' });
    expect(
      (meAfterRevocation.body as ApiBody).data.user.placeMemberships as Array<{ placeId: string }>,
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ placeId: place.id })]));
    await request(server)
      .get(`/api/v1/places/${place.id}/members`)
      .auth(userToken, { type: 'bearer' })
      .expect(404);

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password });
    const adminToken = (adminLogin.body as ApiBody).data.accessToken;
    const list = await request(server)
      .get('/api/v1/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc')
      .auth(adminToken, { type: 'bearer' });
    expect(list.status).toBe(200);
    expect((list.body as ApiBody).meta.totalItems).toBeGreaterThanOrEqual(3);

    await request(server)
      .put(`/api/v1/users/${target.userId}/platform-role`)
      .auth(adminToken, { type: 'bearer' })
      .send({ platformRole: 'ADMIN' })
      .expect(403);

    const superLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: superAdminEmail, password });
    const superToken = (superLogin.body as ApiBody).data.accessToken;
    const roleChange = await request(server)
      .put(`/api/v1/users/${target.userId}/platform-role`)
      .auth(superToken, { type: 'bearer' })
      .send({ platformRole: 'ADMIN' });
    expect(roleChange.status).toBe(200);
    expect((roleChange.body as ApiBody).data.user.platformRole).toBe('ADMIN');
    await request(server).get('/api/v1/users').auth(userToken, { type: 'bearer' }).expect(200);

    await request(server)
      .delete(`/api/v1/users/${target.userId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(403);
    await request(server)
      .put(`/api/v1/users/${target.userId}/platform-role`)
      .auth(superToken, { type: 'bearer' })
      .send({ platformRole: 'USER' })
      .expect(200);
    await request(server).get('/api/v1/users').auth(userToken, { type: 'bearer' }).expect(403);

    const assignOwner = await request(server)
      .put(`/api/v1/places/${place.id}/members/${target.userId}`)
      .auth(superToken, { type: 'bearer' })
      .send({ role: 'OWNER' });
    expect(assignOwner.status).toBe(200);
    await request(server)
      .put(`/api/v1/places/${place.id}/members/${target.userId}`)
      .auth(adminToken, { type: 'bearer' })
      .send({ role: 'OWNER' })
      .expect(403);
    await request(server)
      .put(`/api/v1/places/${place.id}/members/${adminUser.userId}`)
      .auth(userToken, { type: 'bearer' })
      .send({ role: 'CASHIER' })
      .expect(200);
    await request(server)
      .delete(`/api/v1/places/${place.id}/members/${adminUser.userId}`)
      .auth(userToken, { type: 'bearer' })
      .expect(200);
    await request(server)
      .delete(`/api/v1/places/${place.id}/members/${target.userId}`)
      .auth(superToken, { type: 'bearer' })
      .expect(409);
    await request(server)
      .put(`/api/v1/places/${place.id}/members/${superUser.userId}`)
      .auth(superToken, { type: 'bearer' })
      .send({ role: 'OWNER' })
      .expect(200);

    const deactivation = await request(server)
      .delete(`/api/v1/users/${target.userId}`)
      .auth(adminToken, { type: 'bearer' });
    expect(deactivation.status).toBe(200);
    expect((deactivation.body as ApiBody).data.deletedAt).toBeDefined();
    await request(server).get('/api/v1/me').auth(userToken, { type: 'bearer' }).expect(401);
  });
});
