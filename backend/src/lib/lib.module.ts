import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BcryptHashingService } from './bcrypt-hashing.service';
import { UserJwtService } from './jwt-config.service';
import { PrismaService } from './prisma.service';
import { WinstonLoggerService } from './winston-logger.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WinstonLoggerService, UserJwtService, BcryptHashingService, PrismaService],
  exports: [WinstonLoggerService, UserJwtService, BcryptHashingService, PrismaService],
})
export class LibModule {}
