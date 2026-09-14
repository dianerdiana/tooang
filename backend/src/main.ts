import { randomUUID } from 'node:crypto';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';

import envConfig from './config/env';

import { WinstonLoggerService } from './lib';

import { AppModule } from './app.module';

import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = envConfig();
  const logger = app.get(WinstonLoggerService);

  app.set('trust proxy', env.app.trustProxy);
  app.enableCors({
    origin: env.app.corsOrigins,
    credentials: true,
    exposedHeaders: ['X-Request-ID'],
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = performance.now();
    const supplied = request.headers['x-request-id'];
    const requestId =
      typeof supplied === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(supplied)
        ? supplied
        : randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);
    response.on('finish', () => {
      const route = request.route as { path?: string } | undefined;
      const actor = (request as Request & { user?: { userId?: string } }).user;
      logger.log('HTTP request completed', {
        event: 'http.request.completed',
        requestId,
        method: request.method,
        route: route?.path ?? request.baseUrl ?? 'unmatched',
        status: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        ...(actor?.userId ? { actorUserId: actor.userId } : {}),
      });
    });
    next();
  });
  app.use(cookieParser());

  // Logger
  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');

  const rawPort = env.app.port ?? 3000;
  const parsedPort = rawPort > 0 ? Number(rawPort) : Number.NaN;
  const port =
    Number.isFinite(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3000;
  await app.listen(port);
  console.log(`Server running at http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
