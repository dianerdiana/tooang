import { NestFactory } from '@nestjs/core';

import envConfig from './config/env';

import { WinstonLoggerService } from './lib';

import { AppModule } from './app.module';

import 'reflect-metadata';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = envConfig();

  // Logger
  app.useLogger(app.get(WinstonLoggerService));
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
