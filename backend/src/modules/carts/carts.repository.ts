import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type CartsDbClient = PrismaService | Prisma.TransactionClient;

const CART_SELECT = {
  id: true,
  userId: true,
  placeId: true,
  items: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      menuItemId: true,
      quantity: true,
      note: true,
      createdAt: true,
      menuItem: {
        select: {
          placeId: true,
          name: true,
          type: true,
          price: true,
          isAvailable: true,
          deletedAt: true,
          category: {
            select: {
              id: true,
              name: true,
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
export class CartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlace(placeId: string, db: CartsDbClient = this.prisma) {
    return db.place.findFirst({ where: { id: placeId, deletedAt: null }, select: { id: true } });
  }

  findEligibleMenuItem(placeId: string, menuItemId: string, db: CartsDbClient) {
    return db.menuItem.findFirst({
      where: {
        id: menuItemId,
        placeId,
        deletedAt: null,
        isAvailable: true,
        place: { deletedAt: null },
        category: { placeId, deletedAt: null, isActive: true },
      },
      select: { id: true },
    });
  }

  findMenuItemState(placeId: string, menuItemId: string, db: CartsDbClient) {
    return db.menuItem.findFirst({
      where: { id: menuItemId, placeId },
      select: {
        id: true,
        deletedAt: true,
        isAvailable: true,
        category: { select: { deletedAt: true, isActive: true } },
      },
    });
  }

  upsertOwnedCart(userId: string, placeId: string, db: CartsDbClient) {
    return db.cart.upsert({
      where: { userId_placeId: { userId, placeId } },
      create: { userId, placeId },
      update: {},
      select: { id: true, userId: true, placeId: true },
    });
  }

  findOwnedCart(userId: string, placeId: string, db: CartsDbClient = this.prisma) {
    return db.cart.findUnique({
      where: { userId_placeId: { userId, placeId } },
      select: CART_SELECT,
    });
  }

  async lockOwnedCart(cartId: string, userId: string, db: CartsDbClient): Promise<void> {
    await db.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "carts"
      WHERE "id" = ${cartId} AND "user_id" = ${userId}
      FOR UPDATE
    `);
  }

  createCartItem(
    cartId: string,
    placeId: string,
    data: { menuItemId: string; quantity: number; note?: string | null },
    db: CartsDbClient,
  ) {
    return db.cartItem.create({ data: { cartId, placeId, ...data } });
  }

  updateCartItem(
    cartId: string,
    menuItemId: string,
    data: { quantity?: number; note?: string | null },
    db: CartsDbClient,
  ) {
    return db.cartItem.update({
      where: { cartId_menuItemId: { cartId, menuItemId } },
      data,
    });
  }

  deleteCartItem(cartId: string, menuItemId: string, db: CartsDbClient) {
    return db.cartItem.deleteMany({ where: { cartId, menuItemId } });
  }

  deleteInvalidCartItems(cartId: string, ids: readonly string[], db: CartsDbClient) {
    return ids.length
      ? db.cartItem.deleteMany({ where: { cartId, id: { in: [...ids] } } })
      : Promise.resolve({ count: 0 });
  }
}
