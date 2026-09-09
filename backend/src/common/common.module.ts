import { Global, Module } from '@nestjs/common';

import { WinstonLoggerService } from './services/winston-logger.service';

@Global()
@Module({
  providers: [WinstonLoggerService],
  exports: [WinstonLoggerService],
})
export class CommonModule {}
