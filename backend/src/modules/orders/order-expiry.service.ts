import { Injectable } from '@nestjs/common';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import { OrdersRepository } from './orders.repository';

export const ORDER_EXPIRY_BATCH_SIZE = 100;
export const ORDER_EXPIRY_MAX_BATCHES = 10;

@Injectable()
export class OrderExpiryService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async runCycle() {
    let batches = 0;
    let expired = 0;
    while (batches < ORDER_EXPIRY_MAX_BATCHES) {
      const rows = await this.prisma.$transaction(async (tx) => {
        const transitioned = await this.repository.expirePendingBatch(ORDER_EXPIRY_BATCH_SIZE, tx);
        if (transitioned.length) {
          await this.audit.appendMany(
            transitioned.map((row) => ({
              actor: { kind: 'SYSTEM' as const, id: 'order-expiry-worker' as const },
              action: 'ORDER_STATUS_UPDATED' as const,
              targetType: 'Order' as const,
              targetId: row.id,
              beforeData: {
                status: 'PENDING',
                statusUpdatedAt: row.previousStatusUpdatedAt.toISOString(),
              },
              afterData: {
                status: 'EXPIRED',
                statusUpdatedAt: row.statusUpdatedAt.toISOString(),
              },
            })),
            tx,
          );
        }
        return transitioned;
      });
      batches += 1;
      expired += rows.length;
      if (rows.length < ORDER_EXPIRY_BATCH_SIZE) return { batches, expired, capped: false };
    }
    return { batches, expired, capped: true };
  }
}
