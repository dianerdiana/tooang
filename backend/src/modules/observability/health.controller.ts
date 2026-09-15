import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Prisma } from '@/generated/prisma/client';

import { APP_CONFIG } from '@/common/constants';
import { Public } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { PrismaService } from '@/lib/prisma.service';

import { OperationalMetricsService } from './operational-metrics.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  @Get('ready')
  @Public()
  async ready() {
    try {
      this.config.getOrThrow<string>(APP_CONFIG.nodeEnv);
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1 AS "ready"`);
      this.metrics.observe('database_health', 1);
      return HttpResponse.success({
        message: 'Service is ready',
        data: { status: 'ok', checks: { configuration: 'up', database: 'up' } },
      });
    } catch {
      this.metrics.observe('database_health', 0);
      throw new ServiceUnavailableException({
        message: 'Service is not ready',
        code: 'SERVICE_NOT_READY',
      });
    }
  }
}
