import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { HttpExceptionFilter } from './common/filters';
import { JwtAuthGuard, RolesGuard } from './common/guards';

import env from './config/env';

import { LibModule } from './lib';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [env],
    }),
    ThrottlerModule.forRoot([
      { name: 'loginShort', ttl: 15 * 60 * 1000, limit: 10 },
      { name: 'loginLong', ttl: 60 * 60 * 1000, limit: 30 },
      { name: 'registration', ttl: 60 * 60 * 1000, limit: 5 },
      { name: 'refresh', ttl: 15 * 60 * 1000, limit: 30 },
      { name: 'logout', ttl: 15 * 60 * 1000, limit: 60 },
    ]),
    LibModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
