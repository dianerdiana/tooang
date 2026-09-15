import { Injectable } from '@nestjs/common';

import type {
  FulfillmentType,
  OrderStatus,
  PlaceMemberRole,
  PlatformRole,
} from '@/generated/prisma/client';
import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type OrdersDbClient = PrismaService | Prisma.TransactionClient;

export const ORDER_SUMMARY_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  fulfillmentType: true,
  customerName: true,
  diningTableName: true,
  subtotal: true,
  createdAt: true,
  statusUpdatedAt: true,
  expiresAt: true,
  place: { select: { id: true, name: true } },
} satisfies Prisma.OrderSelect;

export const ORDER_DETAIL_SELECT = {
  ...ORDER_SUMMARY_SELECT,
  customerNote: true,
  cancellationReason: true,
  diningTableId: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  items: {
    orderBy: { id: 'asc' },
    select: {
      id: true,
      menuItemId: true,
      itemName: true,
      itemType: true,
      unitPrice: true,
      quantity: true,
      note: true,
      lineTotal: true,
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderReadScope =
  | { kind: 'global' }
  | { kind: 'membership'; actorId: string; allowedRoles: readonly PlaceMemberRole[] };

type OrderListInput = {
  page: number;
  limit: number;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
  placeId?: string;
};

const CHECKOUT_CART_SELECT = {
  id: true,
  userId: true,
  placeId: true,
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      placeId: true,
      menuItemId: true,
      quantity: true,
      note: true,
      menuItem: {
        select: {
          id: true,
          placeId: true,
          name: true,
          type: true,
          price: true,
          isAvailable: true,
          deletedAt: true,
          category: {
            select: {
              placeId: true,
              isActive: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async acquireIdempotencyLock(lockId: bigint, db: OrdersDbClient): Promise<void> {
    await db.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${lockId})::text AS "advisoryLock"`);
  }

  databaseNow(db: OrdersDbClient = this.prisma) {
    return db.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS "now"`);
  }

  findIdempotency(userId: string, endpoint: string, key: string, db: OrdersDbClient) {
    return db.idempotencyKey.findUnique({
      where: { userId_endpoint_key: { userId, endpoint, key } },
    });
  }

  deleteIdempotency(id: string, db: OrdersDbClient) {
    return db.idempotencyKey.delete({ where: { id } });
  }

  createIdempotency(
    data: {
      userId: string;
      endpoint: string;
      key: string;
      requestHash: string;
      responseStatus: number;
      responseBody: Prisma.InputJsonValue;
      createdAt: Date;
      expiresAt: Date;
    },
    db: OrdersDbClient,
  ) {
    return db.idempotencyKey.create({ data });
  }

  async lockActiveUser(userId: string, db: OrdersDbClient): Promise<boolean> {
    const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "users"
      WHERE "id" = ${userId}
        AND "deleted_at" IS NULL
        AND "deletion_requested_at" IS NULL
        AND "anonymized_at" IS NULL
      FOR SHARE
    `);
    return rows.length === 1;
  }

  async lockActiveActor(userId: string, db: OrdersDbClient) {
    const rows = await db.$queryRaw<
      Array<{ id: string; userId: string; platformRole: PlatformRole }>
    >(Prisma.sql`
      SELECT "id", "id_user" AS "userId", "platform_role"::text AS "platformRole"
      FROM "users"
      WHERE "id" = ${userId}
        AND "deleted_at" IS NULL
        AND "deletion_requested_at" IS NULL
        AND "anonymized_at" IS NULL
      FOR SHARE
    `);
    return rows[0] ?? null;
  }

  async lockOwnedCart(userId: string, placeId: string, db: OrdersDbClient) {
    const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "carts"
      WHERE "user_id" = ${userId} AND "place_id" = ${placeId}
      FOR UPDATE
    `);
    return rows[0]?.id ?? null;
  }

  async lockCheckoutState(cartId: string, placeId: string, db: OrdersDbClient): Promise<void> {
    await db.$queryRaw(Prisma.sql`
      SELECT "id" FROM "places" WHERE "id" = ${placeId} FOR SHARE
    `);
    await db.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "business_hours"
      WHERE "place_id" = ${placeId}
      ORDER BY "id"
      FOR SHARE
    `);
    await db.$queryRaw(Prisma.sql`
      SELECT mi."id"
      FROM "cart_items" ci
      JOIN "menu_items" mi
        ON mi."id" = ci."menu_item_id" AND mi."place_id" = ci."place_id"
      JOIN "menu_categories" mc
        ON mc."id" = mi."category_id" AND mc."place_id" = mi."place_id"
      WHERE ci."cart_id" = ${cartId}
      ORDER BY mi."id"
      FOR SHARE OF mi, mc
    `);
  }

  findPlaceState(placeId: string, db: OrdersDbClient) {
    return db.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        timezone: true,
        isPublished: true,
        isOrderingEnabled: true,
        deletedAt: true,
        businessHours: {
          select: { day: true, opensAt: true, closesAt: true, isClosed: true },
        },
      },
    });
  }

  findCheckoutCart(cartId: string, userId: string, placeId: string, db: OrdersDbClient) {
    return db.cart.findFirst({
      where: { id: cartId, userId, placeId },
      select: CHECKOUT_CART_SELECT,
    });
  }

  async lockDiningTable(tableId: string, placeId: string, db: OrdersDbClient): Promise<void> {
    await db.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "dining_tables"
      WHERE "id" = ${tableId} AND "place_id" = ${placeId}
      FOR SHARE
    `);
  }

  findDiningTable(tableId: string, placeId: string, db: OrdersDbClient) {
    return db.diningTable.findFirst({
      where: { id: tableId, placeId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
  }

  createOrder(data: Prisma.OrderCreateArgs['data'], db: OrdersDbClient) {
    return db.order.create({
      data,
      select: {
        id: true,
        orderCode: true,
        status: true,
        createdAt: true,
        statusUpdatedAt: true,
        expiresAt: true,
      },
    });
  }

  clearCart(cartId: string, placeId: string, db: OrdersDbClient) {
    return db.cartItem.deleteMany({ where: { cartId, placeId } });
  }

  listOwn(userId: string, input: OrderListInput) {
    return this.listWithWhere({ userId, ...this.filterWhere(input) }, input);
  }

  listGlobal(input: OrderListInput) {
    return this.listWithWhere(this.filterWhere(input), input);
  }

  listForPlace(placeId: string, scope: OrderReadScope, input: OrderListInput) {
    return this.listWithWhere(
      { placeId, ...this.scopeWhere(scope), ...this.filterWhere(input, false) },
      input,
    );
  }

  findOwnDetail(userId: string, orderId: string, db: OrdersDbClient = this.prisma) {
    return db.order.findFirst({
      where: { id: orderId, userId },
      select: ORDER_DETAIL_SELECT,
    });
  }

  findGlobalDetail(orderId: string, db: OrdersDbClient = this.prisma) {
    return db.order.findUnique({ where: { id: orderId }, select: ORDER_DETAIL_SELECT });
  }

  findPlaceDetail(
    placeId: string,
    orderId: string,
    scope: OrderReadScope,
    db: OrdersDbClient = this.prisma,
  ) {
    return db.order.findFirst({
      where: { id: orderId, placeId, ...this.scopeWhere(scope) },
      select: ORDER_DETAIL_SELECT,
    });
  }

  findPlaceDetailByCode(
    placeId: string,
    orderCode: string,
    scope: OrderReadScope,
    db: OrdersDbClient = this.prisma,
  ) {
    return db.order.findFirst({
      where: { orderCode, placeId, ...this.scopeWhere(scope) },
      select: ORDER_DETAIL_SELECT,
    });
  }

  updateStatusConditionally(
    input: {
      orderId: string;
      placeId?: string;
      userId?: string;
      expectedStatus: OrderStatus;
      targetStatus: OrderStatus;
      now: Date;
      data: Prisma.OrderUpdateManyMutationInput;
    },
    db: OrdersDbClient,
  ) {
    const pendingTimePredicate =
      input.expectedStatus === 'PENDING'
        ? input.targetStatus === 'EXPIRED'
          ? { expiresAt: { lte: input.now } }
          : { expiresAt: { gt: input.now } }
        : {};
    return db.order.updateMany({
      where: {
        id: input.orderId,
        ...(input.placeId ? { placeId: input.placeId } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        status: input.expectedStatus,
        ...pendingTimePredicate,
      },
      data: input.data,
    });
  }

  findPublicVerification(token: string, now: Date) {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
    return this.prisma.order.findFirst({
      where: {
        verificationToken: token,
        verificationDisabledAt: null,
        OR: [
          { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } },
          { status: 'COMPLETED', completedAt: { gt: cutoff } },
          { status: 'CANCELLED', cancelledAt: { gt: cutoff } },
          { status: 'EXPIRED', statusUpdatedAt: { gt: cutoff } },
        ],
      },
      select: {
        orderCode: true,
        status: true,
        fulfillmentType: true,
        createdAt: true,
        expiresAt: true,
        statusUpdatedAt: true,
        place: { select: { name: true } },
      },
    });
  }

  async expirePendingBatch(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      WITH candidates AS (
        SELECT "id"
        FROM "orders"
        WHERE "status" = 'PENDING'::"OrderStatus"
          AND "expires_at" <= CURRENT_TIMESTAMP
        ORDER BY "expires_at", "id"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "orders" AS orders
      SET "status" = 'EXPIRED'::"OrderStatus",
          "status_updated_at" = CURRENT_TIMESTAMP,
          "updated_at" = CURRENT_TIMESTAMP
      FROM candidates
      WHERE orders."id" = candidates."id"
        AND orders."status" = 'PENDING'::"OrderStatus"
        AND orders."expires_at" <= CURRENT_TIMESTAMP
      RETURNING orders."id"
    `);
    return rows.map(({ id }) => id);
  }

  private listWithWhere(where: Prisma.OrderWhereInput, input: OrderListInput) {
    return this.prisma.$transaction(async (tx) => {
      const [orders, totalItems] = await Promise.all([
        tx.order.findMany({
          where,
          select: ORDER_SUMMARY_SELECT,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
        tx.order.count({ where }),
      ]);
      return { orders, totalItems };
    });
  }

  private filterWhere(input: OrderListInput, includePlace = true): Prisma.OrderWhereInput {
    return {
      ...(input.status ? { status: input.status } : {}),
      ...(input.fulfillmentType ? { fulfillmentType: input.fulfillmentType } : {}),
      ...(includePlace && input.placeId ? { placeId: input.placeId } : {}),
    };
  }

  private scopeWhere(scope: OrderReadScope): Prisma.OrderWhereInput {
    if (scope.kind === 'global') return {};
    return {
      place: {
        members: {
          some: {
            userId: scope.actorId,
            role: { in: [...scope.allowedRoles] },
            revokedAt: null,
          },
        },
      },
    };
  }
}
