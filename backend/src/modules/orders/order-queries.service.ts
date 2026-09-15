import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, hasGlobalPlatformPermission, PERMISSION } from '@/common/auth';

import { PlaceAccessService } from '@/modules/places/place-access.service';

import {
  ORDER_DETAIL_SELECT,
  ORDER_SUMMARY_SELECT,
  type OrderReadScope,
  OrdersRepository,
} from './orders.repository';
import type {
  ListGlobalOrdersInput,
  ListMyOrdersInput,
  ListPlaceOrdersInput,
} from './orders.schema';

export type OrderSummaryRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SUMMARY_SELECT }>;
export type OrderDetailRow = Prisma.OrderGetPayload<{ select: typeof ORDER_DETAIL_SELECT }>;

@Injectable()
export class OrderQueriesService {
  constructor(
    private readonly repository: OrdersRepository,
    private readonly placeAccess: PlaceAccessService,
  ) {}

  async listOwn(actor: AuthenticatedActor, input: ListMyOrdersInput) {
    return this.listResponse(await this.repository.listOwn(actor.id, input), input);
  }

  async getOwn(actor: AuthenticatedActor, orderId: string) {
    const order = await this.repository.findOwnDetail(actor.id, orderId);
    if (!order) throw new NotFoundException('Order not found');
    return orderDetailResponse(order);
  }

  async listForPlace(actor: AuthenticatedActor, placeId: string, input: ListPlaceOrdersInput) {
    const scope = await this.placeScope(actor, placeId);
    return this.listResponse(await this.repository.listForPlace(placeId, scope, input), input);
  }

  async getForPlace(actor: AuthenticatedActor, placeId: string, orderId: string) {
    const scope = await this.placeScope(actor, placeId);
    const order = await this.repository.findPlaceDetail(placeId, orderId, scope);
    if (!order) throw new NotFoundException('Order not found');
    return orderDetailResponse(order);
  }

  async getForPlaceByCode(actor: AuthenticatedActor, placeId: string, orderCode: string) {
    const scope = await this.placeScope(actor, placeId);
    const order = await this.repository.findPlaceDetailByCode(placeId, orderCode, scope);
    if (!order) throw new NotFoundException('Order not found');
    return orderDetailResponse(order);
  }

  async listGlobal(actor: AuthenticatedActor, input: ListGlobalOrdersInput) {
    this.assertGlobal(actor);
    return this.listResponse(await this.repository.listGlobal(input), input);
  }

  async getGlobal(actor: AuthenticatedActor, orderId: string) {
    this.assertGlobal(actor);
    const order = await this.repository.findGlobalDetail(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return orderDetailResponse(order);
  }

  private async placeScope(actor: AuthenticatedActor, placeId: string): Promise<OrderReadScope> {
    const access = await this.placeAccess.assertPermission(actor, placeId, PERMISSION.ORDER_READ);
    return access.source === 'platform'
      ? { kind: 'global' }
      : { kind: 'membership', actorId: actor.id, allowedRoles: [access.membershipRole] };
  }

  private assertGlobal(actor: AuthenticatedActor): void {
    if (!hasGlobalPlatformPermission(actor.platformRole, PERMISSION.ORDER_READ)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private listResponse(
    result: { orders: OrderSummaryRow[]; totalItems: number },
    input: { page: number; limit: number },
  ) {
    return {
      orders: result.orders.map(orderSummaryResponse),
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / input.limit),
      },
    };
  }
}

export function orderSummaryResponse(order: OrderSummaryRow) {
  return {
    orderId: order.id,
    orderCode: order.orderCode,
    place: { placeId: order.place.id, name: order.place.name },
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    customerName: order.customerName,
    diningTableName: order.diningTableName,
    subtotal: order.subtotal.toNumber(),
    createdAt: order.createdAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
  };
}

export function orderDetailResponse(order: OrderDetailRow) {
  return {
    ...orderSummaryResponse(order),
    customerNote: order.customerNote,
    cancellationReason: order.cancellationReason,
    diningTable:
      order.diningTableName === null
        ? null
        : { tableId: order.diningTableId, name: order.diningTableName },
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      itemType: item.itemType,
      unitPrice: item.unitPrice.toNumber(),
      quantity: item.quantity,
      note: item.note,
      lineTotal: item.lineTotal.toNumber(),
    })),
  };
}
