import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersController } from './modules/users/users.controller';
import { UsersService } from './modules/users/users.service';

import env from './config/env';
import { AppController } from './app.controller';
import { BcryptHashingService, PrismaService, UserJwtService, WinstonLoggerService } from './lib';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [env],
    }),
  ],
  controllers: [AppController, UsersController],
  providers: [
    PrismaService,
    BcryptHashingService,
    WinstonLoggerService,
    UserJwtService,

    UsersService,
  ],
})
export class AppModule {}
