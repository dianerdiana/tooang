import { Global, Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { OperationalMetricsService } from './operational-metrics.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Global()
@Module({
  controllers: [HealthController],
  providers: [OperationalMetricsService, RequestContextMiddleware],
  exports: [OperationalMetricsService, RequestContextMiddleware],
})
export class ObservabilityModule {}
