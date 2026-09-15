import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import type { AuthenticatedActor } from '@/common/auth';

import { PrismaService } from '../../lib';

import { CartsRepository } from './carts.repository';
import type { AddCartItemInput, UpdateCartItemInput } from './carts.schema';

const MAX_DISTINCT_ITEMS = 50;
const MAX_ITEM_QUANTITY = 99;
const MAX_AGGREGATE_QUANTITY = 200;
const MAX_TRANSACTION_ATTEMPTS = 3;

type InvalidReason = 'ITEM_DELETED' | 'ITEM_UNAVAILABLE' | 'CATEGORY_DELETED' | 'CATEGORY_INACTIVE';

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CartsRepository,
  ) {}

  get(actor: AuthenticatedActor, placeId: string) {
    return this.inTransaction(async (tx) => {
      await this.assertPlace(placeId, tx);
      const cart = await this.repository.findOwnedCart(actor.id, placeId, tx);
      if (!cart) return this.emptyCart(placeId);
      await this.repository.lockOwnedCart(cart.id, actor.id, tx);
      return this.reconcile(actor.id, placeId, tx);
    });
  }

  add(actor: AuthenticatedActor, placeId: string, input: AddCartItemInput) {
    return this.inTransaction(async (tx) => {
      await this.assertPlace(placeId, tx);
      await this.assertEligibleItem(placeId, input.menuItemId, tx);
      const cart = await this.repository.upsertOwnedCart(actor.id, placeId, tx);
      await this.repository.lockOwnedCart(cart.id, actor.id, tx);
      const current = await this.repository.findOwnedCart(actor.id, placeId, tx);
      if (!current) throw new NotFoundException('Cart not found');
      const existing = current.items.find((item) => item.menuItemId === input.menuItemId);
      const quantity = (existing?.quantity ?? 0) + input.quantity;
      this.assertLimits(current.items, input.menuItemId, quantity);
      if (existing) {
        await this.repository.updateCartItem(
          cart.id,
          input.menuItemId,
          {
            quantity,
            ...(input.note === undefined ? {} : { note: input.note }),
          },
          tx,
        );
      } else {
        await this.repository.createCartItem(
          cart.id,
          placeId,
          { menuItemId: input.menuItemId, quantity, note: input.note },
          tx,
        );
      }
      return this.reconcile(actor.id, placeId, tx);
    });
  }

  update(
    actor: AuthenticatedActor,
    placeId: string,
    menuItemId: string,
    input: UpdateCartItemInput,
  ) {
    return this.inTransaction(async (tx) => {
      await this.assertPlace(placeId, tx);
      const cart = await this.repository.findOwnedCart(actor.id, placeId, tx);
      if (!cart) throw new NotFoundException('Cart item not found');
      await this.repository.lockOwnedCart(cart.id, actor.id, tx);
      const current = await this.repository.findOwnedCart(actor.id, placeId, tx);
      const item = current?.items.find((candidate) => candidate.menuItemId === menuItemId);
      if (!item) throw new NotFoundException('Cart item not found');
      if (input.quantity === 0) {
        await this.repository.deleteCartItem(cart.id, menuItemId, tx);
      } else {
        const quantity = input.quantity ?? item.quantity;
        this.assertLimits(current!.items, menuItemId, quantity);
        await this.repository.updateCartItem(
          cart.id,
          menuItemId,
          {
            ...(input.quantity === undefined ? {} : { quantity }),
            ...(input.note === undefined ? {} : { note: input.note }),
          },
          tx,
        );
      }
      return this.reconcile(actor.id, placeId, tx);
    });
  }

  remove(actor: AuthenticatedActor, placeId: string, menuItemId: string) {
    return this.inTransaction(async (tx) => {
      await this.assertPlace(placeId, tx);
      const cart = await this.repository.findOwnedCart(actor.id, placeId, tx);
      if (!cart) return this.emptyCart(placeId);
      await this.repository.lockOwnedCart(cart.id, actor.id, tx);
      await this.repository.deleteCartItem(cart.id, menuItemId, tx);
      return this.reconcile(actor.id, placeId, tx);
    });
  }

  private async reconcile(userId: string, placeId: string, tx: Prisma.TransactionClient) {
    const cart = await this.repository.findOwnedCart(userId, placeId, tx);
    if (!cart) return this.emptyCart(placeId);
    const invalid = cart.items.flatMap((item) => {
      const reason = this.invalidReason(item.menuItem);
      return reason ? [{ cartItemId: item.id, menuItemId: item.menuItemId, reason }] : [];
    });
    await this.repository.deleteInvalidCartItems(
      cart.id,
      invalid.map(({ cartItemId }) => cartItemId),
      tx,
    );
    const invalidIds = new Set(invalid.map(({ cartItemId }) => cartItemId));
    const items = cart.items.filter((item) => !invalidIds.has(item.id));
    return {
      cartId: cart.id,
      placeId,
      distinctItemCount: items.length,
      aggregateQuantity: items.reduce((total, item) => total + item.quantity, 0),
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        type: item.menuItem.type,
        category: { categoryId: item.menuItem.category.id, name: item.menuItem.category.name },
        unitPrice: item.menuItem.price.toNumber(),
        quantity: item.quantity,
        note: item.note,
      })),
      removedItems: invalid.map(({ menuItemId, reason }) => ({ menuItemId, reason })),
    };
  }

  private emptyCart(placeId: string) {
    return {
      cartId: null,
      placeId,
      distinctItemCount: 0,
      aggregateQuantity: 0,
      items: [],
      removedItems: [],
    };
  }

  private invalidReason(item: {
    deletedAt: Date | null;
    isAvailable: boolean;
    category: { deletedAt: Date | null; isActive: boolean };
  }): InvalidReason | null {
    if (item.deletedAt) return 'ITEM_DELETED';
    if (!item.isAvailable) return 'ITEM_UNAVAILABLE';
    if (item.category.deletedAt) return 'CATEGORY_DELETED';
    if (!item.category.isActive) return 'CATEGORY_INACTIVE';
    return null;
  }

  private async assertPlace(placeId: string, tx: Prisma.TransactionClient) {
    if (!(await this.repository.findActivePlace(placeId, tx))) {
      throw new NotFoundException('Place not found');
    }
  }

  private async assertEligibleItem(
    placeId: string,
    menuItemId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (await this.repository.findEligibleMenuItem(placeId, menuItemId, tx)) return;
    const state = await this.repository.findMenuItemState(placeId, menuItemId, tx);
    if (!state) throw new NotFoundException('Menu item not found');
    throw new ConflictException({
      message: 'Menu item is not available for ordering',
      code: 'MENU_ITEM_UNAVAILABLE',
    });
  }

  private assertLimits(
    items: readonly { menuItemId: string; quantity: number }[],
    menuItemId: string,
    quantity: number,
  ) {
    if (quantity > MAX_ITEM_QUANTITY) {
      throw new BadRequestException({
        message: 'Cart item quantity cannot exceed 99',
        code: 'CART_ITEM_QUANTITY_LIMIT',
      });
    }
    const distinct = items.some((item) => item.menuItemId === menuItemId)
      ? items.length
      : items.length + 1;
    if (distinct > MAX_DISTINCT_ITEMS) {
      throw new BadRequestException({
        message: 'Cart cannot contain more than 50 distinct items',
        code: 'CART_DISTINCT_ITEM_LIMIT',
      });
    }
    const aggregate = items.reduce(
      (total, item) => total + (item.menuItemId === menuItemId ? quantity : item.quantity),
      items.some((item) => item.menuItemId === menuItemId) ? 0 : quantity,
    );
    if (aggregate > MAX_AGGREGATE_QUANTITY) {
      throw new BadRequestException({
        message: 'Cart total quantity cannot exceed 200',
        code: 'CART_TOTAL_QUANTITY_LIMIT',
      });
    }
  }

  private async inTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (this.isConstraint(error, 'cart_items_distinct_limit_check')) {
          throw new BadRequestException({
            message: 'Cart cannot contain more than 50 distinct items',
            code: 'CART_DISTINCT_ITEM_LIMIT',
          });
        }
        if (this.isConstraint(error, 'cart_items_total_quantity_check')) {
          throw new BadRequestException({
            message: 'Cart total quantity cannot exceed 200',
            code: 'CART_TOTAL_QUANTITY_LIMIT',
          });
        }
        if (!this.isSerializationFailure(error) || attempt === MAX_TRANSACTION_ATTEMPTS) {
          if (this.isSerializationFailure(error)) {
            throw new ConflictException({
              message: 'Cart changed concurrently; retry the request',
              code: 'CART_CONCURRENT_MODIFICATION',
            });
          }
          throw error;
        }
      }
    }
    throw new ConflictException('Cart changed concurrently');
  }

  private isSerializationFailure(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }

  private isConstraint(error: unknown, constraint: string) {
    return error instanceof Error && `${error.name}: ${error.message}`.includes(constraint);
  }
}
