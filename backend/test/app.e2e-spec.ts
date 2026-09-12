import type { Server } from 'node:http';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import request from 'supertest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.JWT_ACCESS_TOKEN ||= 'e2e-access-secret';
    process.env.JWT_REFRESH_TOKEN ||= 'e2e-refresh-secret';
    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1 (GET)', () => {
    const server = app.getHttpServer() as Server;
    return request(server).get('/api/v1').expect(200).expect('Hello World!');
  });
});
