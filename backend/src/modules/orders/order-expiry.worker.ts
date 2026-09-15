import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { WinstonLoggerService } from '../../lib';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

import { OrderExpiryService } from './order-expiry.service';

export const ORDER_EXPIRY_INTERVAL_MS = 60_000;

@Injectable()
export class OrderExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly expiry: OrderExpiryService,
    private readonly logger: WinstonLoggerService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.run(), ORDER_EXPIRY_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    if (this.running) {
      this.logger.warn('Order expiry worker cycle skipped', {
        event: 'order.expiry.skipped',
        reason: 'previous_cycle_running',
      });
      return;
    }
    this.running = true;
    const startedAt = performance.now();
    try {
      const result = await this.expiry.runCycle();
      this.logger.log('Order expiry worker cycle completed', {
        event: 'order.expiry.completed',
        ...result,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
      if (result.expired) {
        this.metrics.increment('order_expired_total', { outcome: 'expired' });
      }
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'order_expiry',
        outcome: 'success',
      });
    } catch (error) {
      this.logger.error('Order expiry worker cycle failed', undefined, {
        event: 'order.expiry.failed',
        category: error instanceof Error ? error.name : 'unknown',
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'order_expiry',
        outcome: 'failure',
      });
    } finally {
      this.running = false;
    }
  }
}
