import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { PrismaClient, RoleCode } from '../generated/prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

type ApiBody = {
  data: {
    user: { userId: string; email: string; roles: string[] };
    tokens: { accessToken: string; refreshToken: string };
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
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.JWT_ACCESS_TOKEN ||= 'e2e-access-secret';
    process.env.JWT_REFRESH_TOKEN ||= 'e2e-refresh-secret';
    process.env.JWT_ACCESS_TOKEN_EXPIRE ||= '15m';
    process.env.JWT_REFRESH_TOKEN_EXPIRE ||= '7d';

    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });
    for (const code of Object.values(RoleCode)) {
      await prisma.role.upsert({
        where: { code },
        update: {},
        create: { code, name: code },
      });
    }
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { code: RoleCode.SUPER_ADMIN },
    });
    await prisma.user.create({
      data: {
        userId: `usr_${randomUUID().replaceAll('-', '')}`,
        fullName: 'E2E Administrator',
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 10),
        roles: { create: { roleId: superAdminRole.id } },
      },
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      const users = await prisma.user.findMany({
        where: { email: { in: [userEmail, updatedEmail, adminEmail] } },
        select: { id: true },
      });
      const ids = users.map(({ id }) => id);
      await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
      await prisma.refreshSession.deleteMany({ where: { userId: { in: ids } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.$disconnect();
    }
  });

  it('implements the complete authentication and user-administration contract', async () => {
    const registration = await request(server).post('/api/v1/auth/register').send({
      fullName: 'E2E User',
      email: userEmail.toUpperCase(),
      password,
    });
    expect(registration.status).toBe(201);
    const registrationBody = registration.body as ApiBody;
    expect(registrationBody.data.user.email).toBe(userEmail);
    expect(registrationBody.data.user).not.toHaveProperty('passwordHash');
    const targetUserId = registrationBody.data.user.userId;
    const userAccessToken = registrationBody.data.tokens.accessToken;

    const duplicate = await request(server).post('/api/v1/auth/register').send({
      fullName: 'Duplicate',
      email: userEmail,
      password,
    });
    expect(duplicate.status).toBe(409);

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password });
    expect(login.status).toBe(200);
    const loginBody = login.body as ApiBody;
    const originalRefreshToken = loginBody.data.tokens.refreshToken;

    const refresh = await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalRefreshToken });
    expect(refresh.status).toBe(200);
    const refreshBody = refresh.body as ApiBody;
    const accessToken = refreshBody.data.tokens.accessToken;
    const refreshToken = refreshBody.data.tokens.refreshToken;
    expect(refreshToken).not.toBe(originalRefreshToken);

    expect((await request(server).get('/api/v1/me')).status).toBe(401);
    const me = await request(server).get('/api/v1/me').auth(accessToken, { type: 'bearer' });
    expect(me.status).toBe(200);
    expect((me.body as ApiBody).data.user.userId).toBe(targetUserId);

    const update = await request(server)
      .patch('/api/v1/me')
      .auth(accessToken, { type: 'bearer' })
      .send({ fullName: 'Updated E2E User', email: updatedEmail.toUpperCase() });
    expect(update.status).toBe(200);
    expect((update.body as ApiBody).data.user.email).toBe(updatedEmail);

    const forbidden = await request(server)
      .get('/api/v1/users')
      .auth(userAccessToken, { type: 'bearer' });
    expect(forbidden.status).toBe(403);

    const logout = await request(server)
      .post('/api/v1/auth/logout')
      .auth(accessToken, { type: 'bearer' })
      .send({ refreshToken });
    expect(logout.status).toBe(200);

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password });
    expect(adminLogin.status).toBe(200);
    const adminToken = (adminLogin.body as ApiBody).data.tokens.accessToken;

    const list = await request(server)
      .get('/api/v1/users?page=1&limit=20&column=createdAt&sort=desc')
      .auth(adminToken, { type: 'bearer' });
    expect(list.status).toBe(200);
    expect((list.body as ApiBody).meta.totalItems).toBeGreaterThanOrEqual(2);

    const get = await request(server)
      .get(`/api/v1/users/${targetUserId}`)
      .auth(adminToken, { type: 'bearer' });
    expect(get.status).toBe(200);

    const missing = await request(server)
      .get('/api/v1/users/usr_missing')
      .auth(adminToken, { type: 'bearer' });
    expect(missing.status).toBe(404);

    const assignment = await request(server)
      .post(`/api/v1/users/${targetUserId}/roles`)
      .auth(adminToken, { type: 'bearer' })
      .send({ role: 'OWNER' });
    expect(assignment.status).toBe(200);
    expect((assignment.body as ApiBody).data.user.roles).toContain('OWNER');

    const revocation = await request(server)
      .delete(`/api/v1/users/${targetUserId}/roles/OWNER`)
      .auth(adminToken, { type: 'bearer' });
    expect(revocation.status).toBe(200);
    expect((revocation.body as ApiBody).data.user.roles).not.toContain('OWNER');

    const deactivation = await request(server)
      .delete(`/api/v1/users/${targetUserId}`)
      .auth(adminToken, { type: 'bearer' });
    expect(deactivation.status).toBe(200);
    expect((deactivation.body as ApiBody).data.deletedAt).toBeDefined();
  });
});
