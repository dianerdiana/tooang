import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import envConfig from './configs/env';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
