import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { WinstonLoggerService } from '../../lib';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

import { DataLifecycleService } from './data-lifecycle.service';

const ANONYMIZATION_INTERVAL_MS = 60_000;
const RETENTION_INTERVAL_MS = 24 * 60 * 60_000;

@Injectable()
export class DataLifecycleWorker implements OnModuleInit, OnModuleDestroy {
  private anonymizationTimer?: NodeJS.Timeout;
  private retentionTimer?: NodeJS.Timeout;
  private anonymizationRunning = false;
  private retentionRunning = false;

  constructor(
    private readonly lifecycle: DataLifecycleService,
    private readonly logger: WinstonLoggerService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  onModuleInit() {
    void this.runAnonymization();
    void this.runRetention();
    this.anonymizationTimer = setInterval(
      () => void this.runAnonymization(),
      ANONYMIZATION_INTERVAL_MS,
    );
    this.retentionTimer = setInterval(() => void this.runRetention(), RETENTION_INTERVAL_MS);
    this.anonymizationTimer.unref();
    this.retentionTimer.unref();
  }

  onModuleDestroy() {
    if (this.anonymizationTimer) clearInterval(this.anonymizationTimer);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
  }

  private async runAnonymization() {
    if (this.anonymizationRunning) return;
    this.anonymizationRunning = true;
    try {
      const result = await this.lifecycle.runAnonymizationCycle();
      this.logger.log('Account anonymization cycle completed', {
        event: 'lifecycle.anonymization.completed',
        ...result,
      });
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'account_anonymization',
        outcome: 'success',
      });
      if (result.candidates > 0) {
        this.metrics.increment('lifecycle_job_outcomes_total', {
          operation: 'account_anonymization_deadline',
          outcome: 'overdue',
        });
      }
    } catch (error) {
      this.logger.error('Account anonymization cycle failed', undefined, {
        event: 'lifecycle.anonymization.failed',
        category: error instanceof Error ? error.name : 'unknown',
      });
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'account_anonymization',
        outcome: 'failure',
      });
    } finally {
      this.anonymizationRunning = false;
    }
  }

  private async runRetention() {
    if (this.retentionRunning) return;
    this.retentionRunning = true;
    try {
      const result = await this.lifecycle.runRetentionCycle();
      this.logger.log('Retention cleanup cycle completed', {
        event: 'lifecycle.retention.completed',
        ...result,
      });
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'retention_cleanup',
        outcome: 'success',
      });
    } catch (error) {
      this.logger.error('Retention cleanup cycle failed', undefined, {
        event: 'lifecycle.retention.failed',
        category: error instanceof Error ? error.name : 'unknown',
      });
      this.metrics.increment('lifecycle_job_outcomes_total', {
        operation: 'retention_cleanup',
        outcome: 'failure',
      });
    } finally {
      this.retentionRunning = false;
    }
  }
}
