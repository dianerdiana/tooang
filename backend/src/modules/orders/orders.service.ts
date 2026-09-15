import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import type { AuthenticatedActor } from '@/common/auth';
import { HttpResponse } from '@/common/responses';

import { evaluatePlaceOpen } from '@/modules/places/place-opening-state.service';

import { PrismaService } from '../../lib';

import {
  CHECKOUT_ENDPOINT,
  hashCheckoutInput,
  idempotencyAdvisoryLockId,
} from './checkout-identity';
import { OrderCodeService } from './order-code.service';
import { OrdersRepository } from './orders.repository';
import type { CheckoutInput } from './orders.schema';

const MAX_DECIMAL_15_2 = new Prisma.Decimal('9999999999999.99');
const MAX_CODE_ATTEMPTS = 5;
const MAX_CONCURRENCY_ATTEMPTS = 3;

type CheckoutResult = { status: number; body: unknown };

type InvalidCheckoutItemReason =
  | 'CROSS_PLACE_ITEM'
  | 'ITEM_DELETED'
  | 'ITEM_UNAVAILABLE'
  | 'CATEGORY_DELETED'
  | 'CATEGORY_INACTIVE'
  | 'INVALID_QUANTITY';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: OrdersRepository,
    private readonly codes: OrderCodeService,
  ) {}

  async checkout(
    actor: AuthenticatedActor,
    idempotencyKey: string,
    input: CheckoutInput,
  ): Promise<CheckoutResult> {
    const requestHash = hashCheckoutInput(input);
    let codeAttempts = 0;
    let concurrencyAttempts = 0;

    while (true) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.checkoutTransaction(actor, idempotencyKey, requestHash, input, tx),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (this.isGeneratedIdentifierCollision(error)) {
          codeAttempts += 1;
          if (codeAttempts >= MAX_CODE_ATTEMPTS) {
            throw new ServiceUnavailableException({
              message: 'Unable to allocate a unique order identifier',
              code: 'ORDER_CODE_ALLOCATION_FAILED',
            });
          }
          continue;
        }
        if (this.isSerializationFailure(error)) {
          concurrencyAttempts += 1;
          if (concurrencyAttempts >= MAX_CONCURRENCY_ATTEMPTS) {
            throw new ConflictException({
              message: 'Checkout state changed concurrently; retry the request',
              code: 'CHECKOUT_CONCURRENT_MODIFICATION',
            });
          }
          continue;
        }
        throw error;
      }
    }
  }

  private async checkoutTransaction(
    actor: AuthenticatedActor,
    idempotencyKey: string,
    requestHash: string,
    input: CheckoutInput,
    tx: Prisma.TransactionClient,
  ): Promise<CheckoutResult> {
    const lockId = idempotencyAdvisoryLockId(actor.id, CHECKOUT_ENDPOINT, idempotencyKey);
    await this.repository.acquireIdempotencyLock(lockId, tx);
    const [{ now }] = await this.repository.databaseNow(tx);

    const existing = await this.repository.findIdempotency(
      actor.id,
      CHECKOUT_ENDPOINT,
      idempotencyKey,
      tx,
    );
    if (existing && existing.expiresAt > now) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException({
          message: 'Idempotency key was already used with a different request',
          code: 'IDEMPOTENCY_KEY_REUSED',
        });
      }
      return { status: existing.responseStatus, body: existing.responseBody };
    }
    if (existing) await this.repository.deleteIdempotency(existing.id, tx);

    if (!(await this.repository.lockActiveUser(actor.id, tx))) throw new UnauthorizedException();

    const cartId = await this.repository.lockOwnedCart(actor.id, input.placeId, tx);
    if (!cartId) this.cartEmpty();
    await this.repository.lockCheckoutState(cartId, input.placeId, tx);

    const [place, cart] = await Promise.all([
      this.repository.findPlaceState(input.placeId, tx),
      this.repository.findCheckoutCart(cartId, actor.id, input.placeId, tx),
    ]);
    if (!place || place.deletedAt) throw new NotFoundException('Place not found');
    if (!cart || cart.items.length === 0) this.cartEmpty();
    if (!place.isPublished) this.stateConflict('Place is not published', 'PLACE_UNAVAILABLE');
    if (!place.isOrderingEnabled) {
      this.stateConflict('Ordering is disabled for this place', 'ORDERING_DISABLED');
    }
    if (!evaluatePlaceOpen(place.timezone, place.businessHours, now)) {
      this.stateConflict('Place is currently closed', 'PLACE_CLOSED');
    }

    const invalidItems = cart.items.flatMap((item) => {
      const reason = this.invalidItemReason(item, cart.placeId);
      return reason ? [{ menuItemId: item.menuItemId, reason }] : [];
    });
    if (cart.items.length > 50 || cart.items.reduce((sum, item) => sum + item.quantity, 0) > 200) {
      invalidItems.push({ menuItemId: cart.items[0].menuItemId, reason: 'INVALID_QUANTITY' });
    }
    if (invalidItems.length) {
      throw new ConflictException({
        message: 'Cart contains items that cannot be checked out',
        code: 'CART_ITEM_INVALID',
        details: invalidItems.map(({ menuItemId, reason }) => ({
          field: 'items',
          message: 'Cart item is no longer valid',
          code: reason,
          resourceId: menuItemId,
        })),
      });
    }

    const table =
      input.fulfillmentType === 'DINE_IN'
        ? await this.findDiningTable(input.tableId, input.placeId, tx)
        : null;

    const calculatedItems = cart.items.map((item) => {
      const unitPrice = item.menuItem.price;
      const lineTotal = unitPrice.mul(item.quantity);
      if (lineTotal.greaterThan(MAX_DECIMAL_15_2)) this.totalOutOfRange();
      return {
        menuItemId: item.menuItemId,
        itemName: item.menuItem.name,
        itemType: item.menuItem.type,
        unitPrice,
        quantity: item.quantity,
        note: item.note,
        lineTotal,
      };
    });
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    if (subtotal.greaterThan(MAX_DECIMAL_15_2)) this.totalOutOfRange();

    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    const orderCode = this.codes.orderCode(now);
    const verificationToken = this.codes.verificationToken();
    const order = await this.repository.createOrder(
      {
        orderCode,
        verificationToken,
        status: 'PENDING',
        fulfillmentType: input.fulfillmentType,
        customerName: input.customerName,
        customerNote: input.customerNote ?? null,
        diningTableName: table?.name ?? null,
        subtotal,
        createdAt: now,
        statusUpdatedAt: now,
        expiresAt,
        user: { connect: { id: actor.id } },
        place: { connect: { id: input.placeId } },
        ...(table ? { diningTable: { connect: { id: table.id } } } : {}),
        items: {
          create: calculatedItems.map((item) => ({
            itemName: item.itemName,
            itemType: item.itemType,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            note: item.note,
            lineTotal: item.lineTotal,
            menuItem: { connect: { id: item.menuItemId } },
          })),
        },
      },
      tx,
    );

    const body = HttpResponse.success({
      message: 'Order created',
      data: {
        order: {
          orderId: order.id,
          orderCode: order.orderCode,
          placeId: input.placeId,
          status: order.status,
          fulfillmentType: input.fulfillmentType,
          customerName: input.customerName,
          customerNote: input.customerNote ?? null,
          diningTable: table ? { tableId: table.id, name: table.name } : null,
          items: calculatedItems.map((item) => ({
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            itemType: item.itemType,
            unitPrice: item.unitPrice.toNumber(),
            quantity: item.quantity,
            note: item.note,
            lineTotal: item.lineTotal.toNumber(),
          })),
          subtotal: subtotal.toNumber(),
          createdAt: order.createdAt.toISOString(),
          statusUpdatedAt: order.statusUpdatedAt.toISOString(),
          expiresAt: order.expiresAt.toISOString(),
        },
      },
    });

    await this.repository.createIdempotency(
      {
        userId: actor.id,
        endpoint: CHECKOUT_ENDPOINT,
        key: idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: body as unknown as Prisma.InputJsonValue,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      },
      tx,
    );
    await this.repository.clearCart(cart.id, cart.placeId, tx);
    return { status: 201, body };
  }

  private async findDiningTable(tableId: string, placeId: string, tx: Prisma.TransactionClient) {
    await this.repository.lockDiningTable(tableId, placeId, tx);
    const table = await this.repository.findDiningTable(tableId, placeId, tx);
    if (!table) throw new NotFoundException('Dining table not found');
    return table;
  }

  private invalidItemReason(
    item: {
      placeId: string;
      quantity: number;
      menuItem: {
        placeId: string;
        deletedAt: Date | null;
        isAvailable: boolean;
        category: { placeId: string; deletedAt: Date | null; isActive: boolean };
      };
    },
    cartPlaceId: string,
  ): InvalidCheckoutItemReason | null {
    if (
      item.placeId !== cartPlaceId ||
      item.menuItem.placeId !== cartPlaceId ||
      item.menuItem.category.placeId !== cartPlaceId
    ) {
      return 'CROSS_PLACE_ITEM';
    }
    if (item.menuItem.deletedAt) return 'ITEM_DELETED';
    if (!item.menuItem.isAvailable) return 'ITEM_UNAVAILABLE';
    if (item.menuItem.category.deletedAt) return 'CATEGORY_DELETED';
    if (!item.menuItem.category.isActive) return 'CATEGORY_INACTIVE';
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return 'INVALID_QUANTITY';
    }
    return null;
  }

  private cartEmpty(): never {
    throw new ConflictException({ message: 'Cart is empty', code: 'CART_EMPTY' });
  }

  private stateConflict(message: string, code: string): never {
    throw new ConflictException({ message, code });
  }

  private totalOutOfRange(): never {
    throw new ConflictException({
      message: 'Order total exceeds the supported monetary range',
      code: 'ORDER_TOTAL_OUT_OF_RANGE',
    });
  }

  private isSerializationFailure(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }

  private isGeneratedIdentifierCollision(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = `${JSON.stringify(error.meta ?? {})} ${error.message}`;
    return target.includes('order_code') || target.includes('verification_token');
  }
}
