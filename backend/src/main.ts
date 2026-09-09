import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { APP_CONFIG } from './common/constants';
import { WinstonLoggerService } from './common/services';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const logger = app.get<WinstonLoggerService>(WinstonLoggerService);

  // Logger
  app.useLogger(logger);

  // enable cors
  app.enableCors({
    origin: ['*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = configService.get<number>(APP_CONFIG.port) ?? 3000;

  await app.listen(process.env.PORT ?? 3000, () => {
    if (configService.getOrThrow<string>(APP_CONFIG.nodeEnv) === 'development') {
      console.log(`App is running on port: http://localhost:${port}`);
    }
  });
}

bootstrap().catch((err) => console.log(err));
