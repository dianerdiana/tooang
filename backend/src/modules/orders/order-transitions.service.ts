import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  OrderStatus,
  type OrderStatus as OrderStatusType,
  Prisma,
} from '@/generated/prisma/client';

import {
  type AuthenticatedActor,
  hasGlobalPlatformPermission,
  PERMISSION,
  type Permission,
} from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';
import {
  PlaceAccessService,
  type ResolvedPlaceAccess,
} from '@/modules/places/place-access.service';

import { PrismaService } from '../../lib';

import { orderDetailResponse } from './order-queries.service';
import {
  OrderTransitionError,
  type OrderTransitionPatch,
  resolveOrderTransition,
} from './order-transition';
import { type OrderReadScope, OrdersRepository } from './orders.repository';
import type { MyOrderStatusInput, OperationalOrderStatusInput } from './orders.schema';

const MAX_CONCURRENCY_ATTEMPTS = 3;

@Injectable()
export class OrderTransitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: OrdersRepository,
    private readonly placeAccess: PlaceAccessService,
    private readonly audit: AuditService,
  ) {}

  transitionOwn(actor: AuthenticatedActor, orderId: string, input: MyOrderStatusInput) {
    return this.inSerializableTransaction(async (tx) => {
      const currentActor = await this.repository.lockActiveActor(actor.id, tx);
      if (!currentActor) throw new UnauthorizedException();
      const order = await this.repository.findOwnDetail(currentActor.id, orderId, tx);
      if (!order) throw new NotFoundException('Order not found');

      if (
        !hasGlobalPlatformPermission(currentActor.platformRole, PERMISSION.ORDER_CANCEL) &&
        order.status !== OrderStatus.PENDING
      ) {
        this.transitionConflict('This order cannot be cancelled by its customer');
      }

      const [{ now }] = await this.repository.databaseNow(tx);
      return this.applyTransition(
        currentActor,
        order,
        input.status,
        input.cancellationReason ?? null,
        now,
        { kind: 'own', userId: currentActor.id },
        undefined,
        tx,
      );
    });
  }

  transitionForPlace(
    actor: AuthenticatedActor,
    placeId: string,
    orderId: string,
    input: OperationalOrderStatusInput,
  ) {
    return this.inSerializableTransaction(async (tx) => {
      const currentActor = await this.repository.lockActiveActor(actor.id, tx);
      if (!currentActor) throw new UnauthorizedException();
      const permission = this.permissionFor(input.status);
      const access = await this.placeAccess.assertPermission(currentActor, placeId, permission, tx);
      const readScope = this.readScope(currentActor, access);
      const order = await this.repository.findPlaceDetail(placeId, orderId, readScope, tx);
      if (!order) throw new NotFoundException('Order not found');
      const [{ now }] = await this.repository.databaseNow(tx);
      return this.applyTransition(
        currentActor,
        order,
        input.status,
        'cancellationReason' in input ? (input.cancellationReason ?? null) : null,
        now,
        { kind: 'place', placeId, readScope },
        access,
        tx,
      );
    });
  }

  private async applyTransition(
    actor: AuthenticatedActor,
    order: Awaited<ReturnType<OrdersRepository['findOwnDetail']>> & {},
    targetStatus: OrderStatusType,
    cancellationReason: string | null,
    now: Date,
    scope:
      | { kind: 'own'; userId: string }
      | { kind: 'place'; placeId: string; readScope: OrderReadScope },
    access: ResolvedPlaceAccess | undefined,
    tx: Prisma.TransactionClient,
  ) {
    let patch: OrderTransitionPatch;
    try {
      patch = resolveOrderTransition({
        currentStatus: order.status,
        targetStatus,
        expiresAt: order.expiresAt,
        now,
        cancellationReason,
      });
    } catch (error) {
      this.mapTransitionError(error);
    }

    const updated = await this.repository.updateStatusConditionally(
      {
        orderId: order.id,
        ...(scope.kind === 'place' ? { placeId: scope.placeId } : {}),
        ...(scope.kind === 'own' ? { userId: scope.userId } : {}),
        expectedStatus: order.status,
        targetStatus,
        now,
        data: patch,
      },
      tx,
    );
    if (updated.count !== 1) {
      const current =
        scope.kind === 'own'
          ? await this.repository.findOwnDetail(scope.userId, order.id, tx)
          : await this.repository.findPlaceDetail(scope.placeId, order.id, scope.readScope, tx);
      if (!current) throw new NotFoundException('Order not found');
      if (current.status === OrderStatus.PENDING && current.expiresAt <= now) {
        throw new ConflictException({
          message: 'The pending order has expired',
          code: 'ORDER_PENDING_EXPIRED',
        });
      }
      throw new ConflictException({
        message: 'Order status changed concurrently',
        code: 'ORDER_STATUS_CHANGED',
      });
    }

    await this.audit.append(
      {
        actor: { kind: 'USER', userId: actor.id },
        action: 'ORDER_STATUS_UPDATED',
        targetType: 'Order',
        targetId: order.id,
        beforeData: { status: order.status, statusUpdatedAt: order.statusUpdatedAt.toISOString() },
        afterData: { status: targetStatus, statusUpdatedAt: now.toISOString() },
      },
      tx,
    );
    if (access?.source === 'platform') {
      await this.audit.append(
        {
          actor: { kind: 'USER', userId: actor.id },
          action: 'ADMIN_CROSS_PLACE_MUTATION',
          targetType: 'Order',
          targetId: order.id,
          afterData: {
            operation: 'ORDER_STATUS_UPDATED',
            permission: access.permission,
            placeId: order.place.id,
            changedFields: ['status', 'statusUpdatedAt'],
          },
        },
        tx,
      );
    }

    const result = await this.repository.findGlobalDetail(order.id, tx);
    if (!result) throw new NotFoundException('Order not found');
    return orderDetailResponse(result);
  }

  private permissionFor(status: OperationalOrderStatusInput['status']): Permission {
    const permissions: Record<OperationalOrderStatusInput['status'], Permission> = {
      CONFIRMED: PERMISSION.ORDER_CONFIRM,
      PREPARING: PERMISSION.ORDER_PREPARE,
      READY: PERMISSION.ORDER_READY,
      COMPLETED: PERMISSION.ORDER_COMPLETE,
      CANCELLED: PERMISSION.ORDER_CANCEL,
    };
    return permissions[status];
  }

  private readScope(actor: AuthenticatedActor, access: ResolvedPlaceAccess): OrderReadScope {
    return access.source === 'platform'
      ? { kind: 'global' }
      : { kind: 'membership', actorId: actor.id, allowedRoles: [access.membershipRole] };
  }

  private mapTransitionError(error: unknown): never {
    if (!(error instanceof OrderTransitionError)) throw error;
    if (error.code === 'CANCELLATION_REASON_REQUIRED') {
      throw new BadRequestException({
        message: 'A cancellation reason is required after PENDING',
        code: error.code,
      });
    }
    if (error.code === 'CANCELLATION_REASON_INVALID') {
      throw new BadRequestException({
        message: 'Cancellation reason is invalid',
        code: error.code,
      });
    }
    if (error.code === 'ORDER_PENDING_EXPIRED') {
      throw new ConflictException({ message: 'The pending order has expired', code: error.code });
    }
    this.transitionConflict('The requested order status transition is not allowed');
  }

  private transitionConflict(message: string): never {
    throw new ConflictException({ message, code: 'ORDER_STATUS_TRANSITION_INVALID' });
  }

  private async inSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; attempt <= MAX_CONCURRENCY_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.$transaction(callback, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') {
          throw error;
        }
        if (attempt === MAX_CONCURRENCY_ATTEMPTS) {
          throw new ConflictException({
            message: 'Order status changed concurrently',
            code: 'ORDER_STATUS_CHANGED',
          });
        }
      }
    }
    throw new ConflictException({
      message: 'Order status changed concurrently',
      code: 'ORDER_STATUS_CHANGED',
    });
  }
}
