import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';

import { APP_CONFIG } from './common/constants';

import { WinstonLoggerService } from './lib';
import { redactLogString } from './lib/winston-logger.service';

import { AppModule } from './app.module';

import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = app.get(WinstonLoggerService);

  app.set('trust proxy', config.getOrThrow(APP_CONFIG.trustProxy));
  app.enableCors({
    origin: config.getOrThrow<string[]>(APP_CONFIG.corsOrigins),
    credentials: true,
    exposedHeaders: ['X-Request-ID'],
  });
  app.use(cookieParser());

  // Logger
  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');

  const rawPort = config.get<number>(APP_CONFIG.port) ?? 3000;
  const parsedPort = rawPort > 0 ? Number(rawPort) : Number.NaN;
  const port =
    Number.isFinite(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3000;
  await app.listen(port);
  logger.log('Application started', { port });
}

bootstrap().catch((error) => {
  console.error(
    'Failed to start server',
    error instanceof Error
      ? { name: error.name, message: redactLogString(error.message) }
      : { name: 'UnknownError' },
  );
  process.exit(1);
});
