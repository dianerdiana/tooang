import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService, WinstonLoggerService } from '../../lib';

import { DataLifecycleRepository, type LifecycleDbClient } from './data-lifecycle.repository';

export const ANONYMIZATION_BATCH_SIZE = 100;
export const RETENTION_BATCH_SIZE = 100;
export const RETENTION_MAX_BATCHES = 10;

type RetentionDataType = 'authentication_sessions' | 'audit_logs' | 'orders' | 'idempotency_keys';
type RetentionResult = {
  dataType: RetentionDataType;
  deleted: number;
  batches: number;
  capped: boolean;
};

@Injectable()
export class DataLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: DataLifecycleRepository,
    private readonly audit: AuditService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async runAnonymizationCycle(limit = ANONYMIZATION_BATCH_SIZE) {
    const [{ now }] = await this.repository.databaseNow();
    const candidates = await this.repository.listDueAnonymizationIds(now, limit);
    const runId = randomUUID();
    let anonymized = 0;
    let failed = 0;
    for (const candidate of candidates) {
      try {
        if (await this.anonymizeUser(candidate.id, now)) anonymized += 1;
      } catch (error) {
        failed += 1;
        this.logger.error('Account anonymization failed for candidate', undefined, {
          event: 'lifecycle.anonymization.candidate_failed',
          targetId: candidate.id,
          category: error instanceof Error ? error.name : 'unknown',
          runId,
        });
      }
    }
    return { runId, candidates: candidates.length, anonymized, failed };
  }

  anonymizeUser(userId: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.repository.lockDueUser(userId, now, tx);
      if (!user) return false;
      const [carts, sessions, idempotencyKeys, uploadIntents, placeReviews, menuItemReviews] =
        await Promise.all([
          this.repository.deleteCarts(user.id, tx),
          this.repository.deleteRefreshSessions(user.id, tx),
          this.repository.deleteIdempotencyKeys(user.id, tx),
          this.repository.deleteUnconsumedUploadIntents(user.id, tx),
          this.repository.anonymizePlaceReviews(user.id, now, tx),
          this.repository.anonymizeMenuItemReviews(user.id, now, tx),
        ]);
      const orderItems = await this.repository.anonymizeOrderItems(user.id, tx);
      const orders = await this.repository.anonymizeOrders(user.id, tx);
      await this.repository.anonymizeUser(user.id, now, tx);
      await this.audit.append(
        {
          actor: { kind: 'SYSTEM', id: 'account-anonymization-worker' },
          action: 'ACCOUNT_ANONYMIZED',
          targetType: 'User',
          targetId: user.userId,
          beforeData: { status: 'DELETION_PENDING' },
          afterData: {
            status: 'ANONYMIZED',
            anonymizedAt: now.toISOString(),
            affected: {
              carts: carts.count,
              sessions: sessions.count,
              idempotencyKeys: idempotencyKeys.count,
              uploadIntents: uploadIntents.count,
              placeReviews: placeReviews.count,
              menuItemReviews: menuItemReviews.count,
              orders: orders.count,
              orderItems: orderItems.count,
            },
          },
        },
        tx,
      );
      return true;
    });
  }

  async runRetentionCycle() {
    const [{ now, sessionCutoff, auditCutoff, orderCutoff }] =
      await this.repository.retentionCutoffs();
    const results: RetentionResult[] = [];
    results.push(
      await this.cleanup('authentication_sessions', sessionCutoff, (cutoff, limit, tx) =>
        this.repository.deleteExpiredRefreshSessions(cutoff, limit, tx),
      ),
    );
    results.push(
      await this.cleanup('audit_logs', auditCutoff, (cutoff, limit, tx) =>
        this.repository.deleteExpiredAuditLogs(cutoff, limit, tx),
      ),
    );
    results.push(
      await this.cleanup('orders', orderCutoff, (cutoff, limit, tx) =>
        this.repository.deleteExpiredOrders(cutoff, limit, tx),
      ),
    );
    const staleOrders = await this.repository.countStaleNonTerminalOrders(orderCutoff);
    if (staleOrders) {
      this.logger.warn('Retention skipped stale non-terminal orders', {
        event: 'lifecycle.retention.stale_orders',
        count: staleOrders,
      });
    }
    results.push(
      await this.cleanup('idempotency_keys', now, (cutoff, limit, tx) =>
        this.repository.deleteExpiredIdempotencyKeys(cutoff, limit, tx),
      ),
    );
    return { results, staleOrders };
  }

  private cleanup(
    dataType: RetentionDataType,
    cutoff: Date,
    remove: (cutoff: Date, limit: number, db: LifecycleDbClient) => Promise<Array<{ id: string }>>,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        let deleted = 0;
        let batches = 0;
        while (batches < RETENTION_MAX_BATCHES) {
          const rows = await remove(cutoff, RETENTION_BATCH_SIZE, tx);
          deleted += rows.length;
          batches += 1;
          if (rows.length < RETENTION_BATCH_SIZE) break;
        }
        const runId = randomUUID();
        await this.audit.append(
          {
            actor: { kind: 'SYSTEM', id: 'retention-cleanup-worker' },
            action: 'RETENTION_CLEANUP_COMPLETED',
            targetType: 'DataRetentionJob',
            targetId: runId,
            afterData: { dataType, cutoff: cutoff.toISOString(), deleted, batches },
          },
          tx,
        );
        return { dataType, deleted, batches, capped: batches === RETENTION_MAX_BATCHES };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
