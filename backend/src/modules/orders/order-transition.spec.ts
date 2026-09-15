import { OrderStatus, type OrderStatus as OrderStatusType } from '@/generated/prisma/client';

import { OrderTransitionError, resolveOrderTransition } from './order-transition';

const now = new Date('2026-09-15T12:00:00.000Z');
const future = new Date('2026-09-15T12:01:00.000Z');
const statuses = Object.values(OrderStatus);
const allowed = new Set([
  'PENDING:CONFIRMED',
  'PENDING:CANCELLED',
  'CONFIRMED:PREPARING',
  'CONFIRMED:CANCELLED',
  'PREPARING:READY',
  'PREPARING:CANCELLED',
  'READY:COMPLETED',
  'READY:CANCELLED',
]);

function transition(
  currentStatus: OrderStatusType,
  targetStatus: OrderStatusType,
  cancellationReason: string | null = targetStatus === OrderStatus.CANCELLED ? 'reason' : null,
) {
  return resolveOrderTransition({
    currentStatus,
    targetStatus,
    cancellationReason,
    expiresAt: future,
    now,
  });
}

function errorCode(callback: () => unknown) {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderTransitionError);
    return (error as OrderTransitionError).code;
  }
  throw new Error('Expected transition to fail');
}

describe('resolveOrderTransition', () => {
  it.each(statuses.flatMap((from) => statuses.map((to) => [from, to] as const)))(
    'applies the exhaustive %s -> %s matrix',
    (from, to) => {
      if (allowed.has(`${from}:${to}`)) {
        expect(transition(from, to)).toMatchObject({ status: to, statusUpdatedAt: now });
      } else {
        expect(() => transition(from, to)).toThrow(OrderTransitionError);
      }
    },
  );

  it('treats the exact expiry boundary as expired and permits only internal expiry', () => {
    expect(
      errorCode(() =>
        resolveOrderTransition({
          currentStatus: 'PENDING',
          targetStatus: 'CONFIRMED',
          expiresAt: now,
          now,
          cancellationReason: null,
        }),
      ),
    ).toBe('ORDER_PENDING_EXPIRED');
    expect(
      resolveOrderTransition({
        currentStatus: 'PENDING',
        targetStatus: 'EXPIRED',
        expiresAt: now,
        now,
        cancellationReason: null,
      }),
    ).toEqual({ status: 'EXPIRED', statusUpdatedAt: now });
  });

  it('requires a reason only for cancellation after PENDING', () => {
    expect(transition('PENDING', 'CANCELLED', null)).toMatchObject({
      cancellationReason: null,
    });
    expect(errorCode(() => transition('CONFIRMED', 'CANCELLED', null))).toBe(
      'CANCELLATION_REASON_REQUIRED',
    );
    expect(transition('READY', 'CANCELLED', 'Kitchen closed')).toMatchObject({
      cancelledAt: now,
      cancellationReason: 'Kitchen closed',
    });
  });

  it('sets only the timestamp corresponding to the entered status', () => {
    expect(transition('PENDING', 'CONFIRMED')).toEqual({
      status: 'CONFIRMED',
      statusUpdatedAt: now,
      confirmedAt: now,
    });
    expect(transition('READY', 'COMPLETED')).toEqual({
      status: 'COMPLETED',
      statusUpdatedAt: now,
      completedAt: now,
    });
  });
});
