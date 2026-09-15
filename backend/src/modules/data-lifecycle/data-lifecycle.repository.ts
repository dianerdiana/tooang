import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type LifecycleDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class DataLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  databaseNow(db: LifecycleDbClient = this.prisma) {
    return db.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS "now"`);
  }

  retentionCutoffs(db: LifecycleDbClient = this.prisma) {
    return db.$queryRaw<
      Array<{
        now: Date;
        sessionCutoff: Date;
        auditCutoff: Date;
        orderCutoff: Date;
      }>
    >(Prisma.sql`
      SELECT
        CURRENT_TIMESTAMP AS "now",
        CURRENT_TIMESTAMP - INTERVAL '30 days' AS "sessionCutoff",
        CURRENT_TIMESTAMP - INTERVAL '1 year' AS "auditCutoff",
        CURRENT_TIMESTAMP - INTERVAL '5 years' AS "orderCutoff"
    `);
  }

  listDueAnonymizationIds(now: Date, limit: number) {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
    return this.prisma.user.findMany({
      where: { deletionRequestedAt: { lte: cutoff }, anonymizedAt: null },
      select: { id: true },
      orderBy: [{ deletionRequestedAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async lockDueUser(userId: string, now: Date, db: LifecycleDbClient) {
    const rows = await db.$queryRaw<
      Array<{ id: string; userId: string; deletionRequestedAt: Date }>
    >(Prisma.sql`
      SELECT "id", "id_user" AS "userId", "deletion_requested_at" AS "deletionRequestedAt"
      FROM "users"
      WHERE "id" = ${userId}
        AND "deletion_requested_at" <= ${now} - INTERVAL '30 days'
        AND "anonymized_at" IS NULL
      FOR UPDATE SKIP LOCKED
    `);
    return rows[0] ?? null;
  }

  deleteCarts(userId: string, db: LifecycleDbClient) {
    return db.cart.deleteMany({ where: { userId } });
  }

  deleteRefreshSessions(userId: string, db: LifecycleDbClient) {
    return db.refreshSession.deleteMany({ where: { userId } });
  }

  deleteIdempotencyKeys(userId: string, db: LifecycleDbClient) {
    return db.idempotencyKey.deleteMany({ where: { userId } });
  }

  deleteUnconsumedUploadIntents(userId: string, db: LifecycleDbClient) {
    return db.mediaUploadIntent.deleteMany({ where: { actorUserId: userId, completedAt: null } });
  }

  async anonymizePlaceReviews(userId: string, now: Date, db: LifecycleDbClient) {
    const active = await db.placeReview.updateMany({
      where: { userId, deletedAt: null },
      data: { comment: null, deletedAt: now },
    });
    const deleted = await db.placeReview.updateMany({
      where: { userId, deletedAt: { not: null }, comment: { not: null } },
      data: { comment: null },
    });
    return { count: active.count + deleted.count };
  }

  async anonymizeMenuItemReviews(userId: string, now: Date, db: LifecycleDbClient) {
    const active = await db.menuItemReview.updateMany({
      where: { userId, deletedAt: null },
      data: { comment: null, deletedAt: now },
    });
    const deleted = await db.menuItemReview.updateMany({
      where: { userId, deletedAt: { not: null }, comment: { not: null } },
      data: { comment: null },
    });
    return { count: active.count + deleted.count };
  }

  anonymizeOrderItems(userId: string, db: LifecycleDbClient) {
    return db.orderItem.updateMany({ where: { order: { userId } }, data: { note: null } });
  }

  anonymizeOrders(userId: string, db: LifecycleDbClient) {
    return db.order.updateMany({
      where: { userId },
      data: { customerName: 'Deleted User', customerNote: null },
    });
  }

  anonymizeUser(userId: string, now: Date, db: LifecycleDbClient) {
    return db.user.update({
      where: { id: userId, anonymizedAt: null },
      data: {
        fullName: 'Deleted User',
        email: `deleted-${userId}@anonymized.invalid`,
        passwordHash: '!ANONYMIZED!',
        platformRole: 'USER',
        deletedAt: now,
        anonymizedAt: now,
      },
      select: { id: true, userId: true, anonymizedAt: true },
    });
  }

  deleteExpiredRefreshSessions(cutoff: Date, limit: number, db: LifecycleDbClient) {
    return this.deleteBatch('refresh_sessions', 'expires_at', cutoff, limit, db);
  }

  deleteExpiredAuditLogs(cutoff: Date, limit: number, db: LifecycleDbClient) {
    return this.deleteBatch('audit_logs', 'created_at', cutoff, limit, db);
  }

  deleteExpiredIdempotencyKeys(cutoff: Date, limit: number, db: LifecycleDbClient) {
    return this.deleteBatch('idempotency_keys', 'expires_at', cutoff, limit, db);
  }

  async deleteExpiredOrders(cutoff: Date, limit: number, db: LifecycleDbClient) {
    return db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH candidates AS (
        SELECT "id" FROM "orders"
        WHERE "created_at" <= ${cutoff}
          AND "status" IN ('COMPLETED'::"OrderStatus", 'CANCELLED'::"OrderStatus", 'EXPIRED'::"OrderStatus")
        ORDER BY "created_at", "id"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      DELETE FROM "orders" target
      USING candidates
      WHERE target."id" = candidates."id"
      RETURNING target."id"
    `);
  }

  countStaleNonTerminalOrders(cutoff: Date, db: LifecycleDbClient = this.prisma) {
    return db.order.count({
      where: {
        createdAt: { lte: cutoff },
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
      },
    });
  }

  private deleteBatch(
    table: 'refresh_sessions' | 'audit_logs' | 'idempotency_keys',
    column: 'expires_at' | 'created_at',
    cutoff: Date,
    limit: number,
    db: LifecycleDbClient,
  ) {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${column}"`);
    return db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH candidates AS (
        SELECT "id" FROM ${tableSql}
        WHERE ${columnSql} <= ${cutoff}
        ORDER BY ${columnSql}, "id"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      DELETE FROM ${tableSql} target
      USING candidates
      WHERE target."id" = candidates."id"
      RETURNING target."id"
    `);
  }
}
