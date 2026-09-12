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
  const runId = randomUUID().replaceAll('-', '');
  const userEmail = `user-${runId}@example.com`;
  const updatedEmail = `updated-${runId}@example.com`;
  const adminEmail = `admin-${runId}@example.com`;
  const superAdminEmail = `super-${runId}@example.com`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.JWT_ACCESS_TOKEN ||= 'e2e-access-secret';
    process.env.JWT_REFRESH_TOKEN ||= 'e2e-refresh-secret';
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
        where: { email: { in: [userEmail, updatedEmail, adminEmail, superAdminEmail] } },
        select: { id: true },
      });
      const ids = users.map(({ id }) => id);
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
      await prisma.refreshSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.placeMember.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
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
    const originalAccessToken = (login.body as ApiBody).data.accessToken;

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

  it('enforces ADMIN and SUPER_ADMIN user-administration boundaries', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: updatedEmail } });
    const userLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: updatedEmail, password });
    const userToken = (userLogin.body as ApiBody).data.accessToken;
    await request(server).get('/api/v1/users').auth(userToken, { type: 'bearer' }).expect(403);

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

    await request(server)
      .delete(`/api/v1/users/${target.userId}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(403);
    await request(server)
      .put(`/api/v1/users/${target.userId}/platform-role`)
      .auth(superToken, { type: 'bearer' })
      .send({ platformRole: 'USER' })
      .expect(200);
    const deactivation = await request(server)
      .delete(`/api/v1/users/${target.userId}`)
      .auth(adminToken, { type: 'bearer' });
    expect(deactivation.status).toBe(200);
    expect((deactivation.body as ApiBody).data.deletedAt).toBeDefined();
    await request(server).get('/api/v1/me').auth(userToken, { type: 'bearer' }).expect(401);
  });
});
