import { OrderStatus, type OrderStatus as OrderStatusType } from '@/generated/prisma/client';

export type OrderTransitionErrorCode =
  | 'ORDER_PENDING_EXPIRED'
  | 'ORDER_STATUS_TRANSITION_INVALID'
  | 'CANCELLATION_REASON_REQUIRED'
  | 'CANCELLATION_REASON_INVALID';

export class OrderTransitionError extends Error {
  constructor(readonly code: OrderTransitionErrorCode) {
    super(code);
    this.name = 'OrderTransitionError';
  }
}

export type OrderTransitionPatch = {
  status: OrderStatusType;
  statusUpdatedAt: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string | null;
};

const ALLOWED = new Map<OrderStatusType, ReadonlySet<OrderStatusType>>([
  [OrderStatus.PENDING, new Set([OrderStatus.CONFIRMED, OrderStatus.CANCELLED])],
  [OrderStatus.CONFIRMED, new Set([OrderStatus.PREPARING, OrderStatus.CANCELLED])],
  [OrderStatus.PREPARING, new Set([OrderStatus.READY, OrderStatus.CANCELLED])],
  [OrderStatus.READY, new Set([OrderStatus.COMPLETED, OrderStatus.CANCELLED])],
  [OrderStatus.COMPLETED, new Set()],
  [OrderStatus.CANCELLED, new Set()],
  [OrderStatus.EXPIRED, new Set()],
]);

const unicodeLength = (value: string) => Array.from(value).length;

export function resolveOrderTransition(input: {
  currentStatus: OrderStatusType;
  targetStatus: OrderStatusType;
  expiresAt: Date;
  now: Date;
  cancellationReason: string | null;
}): OrderTransitionPatch {
  const { currentStatus, targetStatus, expiresAt, now, cancellationReason } = input;
  const pendingExpired = currentStatus === OrderStatus.PENDING && expiresAt <= now;

  if (pendingExpired) {
    if (targetStatus !== OrderStatus.EXPIRED) {
      throw new OrderTransitionError('ORDER_PENDING_EXPIRED');
    }
  } else if (!ALLOWED.get(currentStatus)?.has(targetStatus)) {
    throw new OrderTransitionError('ORDER_STATUS_TRANSITION_INVALID');
  }

  if (targetStatus === OrderStatus.EXPIRED && !pendingExpired) {
    throw new OrderTransitionError('ORDER_STATUS_TRANSITION_INVALID');
  }

  if (targetStatus === OrderStatus.CANCELLED) {
    if (cancellationReason !== null && unicodeLength(cancellationReason) > 500) {
      throw new OrderTransitionError('CANCELLATION_REASON_INVALID');
    }
    if (currentStatus !== OrderStatus.PENDING && !cancellationReason) {
      throw new OrderTransitionError('CANCELLATION_REASON_REQUIRED');
    }
  }

  return {
    status: targetStatus,
    statusUpdatedAt: now,
    ...(targetStatus === OrderStatus.CONFIRMED ? { confirmedAt: now } : {}),
    ...(targetStatus === OrderStatus.COMPLETED ? { completedAt: now } : {}),
    ...(targetStatus === OrderStatus.CANCELLED ? { cancelledAt: now, cancellationReason } : {}),
  };
}
