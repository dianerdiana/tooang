import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import env from './config/env';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LibModule } from './lib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [env],
    }),
    LibModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
