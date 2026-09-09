import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WinstonLoggerService } from './services/winston-logger.service';
import { BcryptHashingService, UserJwtService } from './services';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WinstonLoggerService, BcryptHashingService, UserJwtService],
  exports: [WinstonLoggerService, BcryptHashingService, UserJwtService],
})
export class CommonModule {}
