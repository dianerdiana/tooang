import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type OrdersDbClient = PrismaService | Prisma.TransactionClient;

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

  databaseNow(db: OrdersDbClient) {
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
}
