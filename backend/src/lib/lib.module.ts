import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { BcryptHashingService } from './bcrypt-hashing.service';
import { UserJwtService } from './jwt-config.service';
import { WinstonLoggerService } from './winston-logger.service';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WinstonLoggerService, UserJwtService, BcryptHashingService],
  exports: [WinstonLoggerService, UserJwtService, BcryptHashingService],
})
export class LibModule {}
