import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule } from './common/common.module';

import envConfig from './configs/env';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
