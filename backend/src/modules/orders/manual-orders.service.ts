import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { HttpResponse } from '@/common/responses';

import { AuditService } from '@/modules/audit/audit.service';
import { PlaceAccessService } from '@/modules/places/place-access.service';

import { PrismaService } from '../../lib';

import { hashManualOrderInput, idempotencyAdvisoryLockId } from './checkout-identity';
import { OrderCodeService } from './order-code.service';
import { orderDetailResponse } from './order-queries.service';
import { OrdersRepository } from './orders.repository';
import type { CreateManualOrderInput } from './orders.schema';

const MAX_DECIMAL_15_2 = new Prisma.Decimal('9999999999999.99');
const MAX_CODE_ATTEMPTS = 5;
const MAX_CONCURRENCY_ATTEMPTS = 3;

type CreateManualOrderResult = { status: number; body: unknown };

@Injectable()
export class ManualOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: OrdersRepository,
    private readonly codes: OrderCodeService,
    private readonly access: PlaceAccessService,
    private readonly audit: AuditService,
  ) {}

  async options(actor: AuthenticatedActor, placeId: string) {
    await this.access.assertPermission(actor, placeId, PERMISSION.ORDER_CREATE_MANUAL);
    const result = await this.repository.getManualOrderOptions(placeId);
    return {
      categories: result.categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        thumbnailUrl:
          category.thumbnailAsset?.status === 'ACTIVE' ? category.thumbnailAsset.deliveryUrl : null,
        items: category.menuItems.map((item) => ({
          menuItemId: item.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          type: item.type,
          price: item.price.toNumber(),
          imageUrl: item.imageAsset?.status === 'ACTIVE' ? item.imageAsset.deliveryUrl : null,
        })),
      })),
      tables: result.tables.map((table) => ({ tableId: table.id, name: table.name })),
    };
  }

  async create(
    actor: AuthenticatedActor,
    placeId: string,
    idempotencyKey: string,
    input: CreateManualOrderInput,
  ): Promise<CreateManualOrderResult> {
    const endpoint = `/api/v1/places/${placeId}/orders/manual`;
    const requestHash = hashManualOrderInput(placeId, input);
    let codeAttempts = 0;
    let concurrencyAttempts = 0;

    while (true) {
      try {
        return await this.prisma.$transaction(
          (tx) =>
            this.createTransaction(
              actor,
              placeId,
              endpoint,
              idempotencyKey,
              requestHash,
              input,
              tx,
            ),
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
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          concurrencyAttempts += 1;
          if (concurrencyAttempts >= MAX_CONCURRENCY_ATTEMPTS) {
            throw new ConflictException({
              message: 'Order state changed concurrently; retry the request',
              code: 'ORDER_CONCURRENT_MODIFICATION',
            });
          }
          continue;
        }
        throw error;
      }
    }
  }

  private async createTransaction(
    actor: AuthenticatedActor,
    placeId: string,
    endpoint: string,
    idempotencyKey: string,
    requestHash: string,
    input: CreateManualOrderInput,
    tx: Prisma.TransactionClient,
  ): Promise<CreateManualOrderResult> {
    const lockId = idempotencyAdvisoryLockId(actor.id, endpoint, idempotencyKey);
    await this.repository.acquireIdempotencyLock(lockId, tx);
    const [{ now }] = await this.repository.databaseNow(tx);

    const existing = await this.repository.findIdempotency(actor.id, endpoint, idempotencyKey, tx);
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
    await this.access.assertPermission(actor, placeId, PERMISSION.ORDER_CREATE_MANUAL, tx);

    const itemIds = input.items.map((item) => item.menuItemId);
    const tableId = input.fulfillmentType === 'DINE_IN' ? input.tableId : null;
    await this.repository.lockManualOrderState(placeId, itemIds, tableId, tx);

    const menuItems = await this.repository.findManualOrderItems(placeId, itemIds, tx);
    const itemById = new Map(menuItems.map((item) => [item.id, item]));
    const invalidItems = input.items.flatMap((line) => {
      const item = itemById.get(line.menuItemId);
      const valid =
        item &&
        item.placeId === placeId &&
        item.deletedAt === null &&
        item.isAvailable &&
        item.category.placeId === placeId &&
        item.category.deletedAt === null &&
        item.category.isActive;
      return valid ? [] : [{ menuItemId: line.menuItemId }];
    });
    if (invalidItems.length) {
      throw new ConflictException({
        message: 'One or more menu items are unavailable',
        code: 'MANUAL_ORDER_ITEM_INVALID',
        details: invalidItems.map(({ menuItemId }) => ({
          field: 'items',
          message: 'Menu item is not available for this place',
          code: 'ITEM_UNAVAILABLE',
          resourceId: menuItemId,
        })),
      });
    }

    const table = tableId ? await this.repository.findDiningTable(tableId, placeId, tx) : null;
    if (tableId && !table) throw new NotFoundException('Dining table not found');

    const calculatedItems = input.items.map((line) => {
      const item = itemById.get(line.menuItemId)!;
      const lineTotal = item.price.mul(line.quantity);
      if (lineTotal.greaterThan(MAX_DECIMAL_15_2)) this.totalOutOfRange();
      return {
        menuItemId: item.id,
        itemName: item.name,
        itemType: item.type,
        unitPrice: item.price,
        quantity: line.quantity,
        note: line.note ?? null,
        lineTotal,
      };
    });
    const subtotal = calculatedItems.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );
    if (subtotal.greaterThan(MAX_DECIMAL_15_2)) this.totalOutOfRange();

    const order = await this.repository.createOrder(
      {
        orderCode: this.codes.orderCode(now),
        verificationToken: this.codes.verificationToken(),
        verificationDisabledAt: now,
        source: 'MANUAL',
        status: 'CONFIRMED',
        fulfillmentType: input.fulfillmentType,
        customerName: input.customerName,
        customerNote: input.customerNote ?? null,
        diningTableName: table?.name ?? null,
        subtotal,
        createdAt: now,
        statusUpdatedAt: now,
        confirmedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60_000),
        createdBy: { connect: { id: actor.id } },
        place: { connect: { id: placeId } },
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
    const detail = await this.repository.findOrderDetail(order.id, tx);
    if (!detail) throw new NotFoundException('Order not found');

    await this.audit.append(
      {
        actor: { kind: 'USER', userId: actor.id },
        action: 'MANUAL_ORDER_CREATED',
        targetType: 'Order',
        targetId: order.id,
        afterData: {
          placeId,
          source: 'MANUAL',
          status: 'CONFIRMED',
          fulfillmentType: input.fulfillmentType,
          itemCount: calculatedItems.length,
          subtotal: subtotal.toString(),
        },
      },
      tx,
    );

    const body = HttpResponse.success({
      message: 'Manual order created',
      data: { order: orderDetailResponse(detail) },
    });
    await this.repository.createIdempotency(
      {
        userId: actor.id,
        endpoint,
        key: idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBody: body as unknown as Prisma.InputJsonValue,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      },
      tx,
    );
    return { status: 201, body };
  }

  private totalOutOfRange(): never {
    throw new ConflictException({
      message: 'Order total exceeds the supported monetary range',
      code: 'ORDER_TOTAL_OUT_OF_RANGE',
    });
  }

  private isGeneratedIdentifierCollision(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }
    const target = `${JSON.stringify(error.meta ?? {})} ${error.message}`;
    return target.includes('order_code') || target.includes('verification_token');
  }
}
