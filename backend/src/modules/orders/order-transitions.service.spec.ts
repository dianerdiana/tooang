import { ConflictException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { OrderTransitionsService } from './order-transitions.service';

const now = new Date('2026-09-15T00:00:00Z');
const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: 'USER' as const };

const order = {
  id: 'order-id',
  orderCode: 'TNG-20260915-ABCDEFGH',
  status: 'PENDING' as const,
  fulfillmentType: 'TAKEAWAY' as const,
  customerName: 'Ayu',
  diningTableName: null,
  diningTableId: null,
  customerNote: null,
  cancellationReason: null,
  subtotal: new Prisma.Decimal(10),
  createdAt: now,
  statusUpdatedAt: now,
  expiresAt: new Date(now.getTime() + 60_000),
  confirmedAt: null,
  completedAt: null,
  cancelledAt: null,
  place: { id: 'place-id', name: 'Place' },
  items: [],
};

function setup(overrides: Record<string, unknown> = {}) {
  const repository = {
    lockActiveActor: jest.fn<() => Promise<unknown>>().mockResolvedValue(actor),
    findOwnDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue(order),
    findPlaceDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue(order),
    findGlobalDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      ...order,
      status: 'CANCELLED',
      cancelledAt: now,
    }),
    databaseNow: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ now }]),
    updateStatusConditionally: jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 1 }),
    ...overrides,
  };
  const prisma = { $transaction: jest.fn((callback: (tx: object) => unknown) => callback({})) };
  const placeAccess = {
    assertPermission: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      source: 'membership',
      membershipRole: 'OWNER',
      permission: 'order.cancel',
    }),
  };
  const audit = { append: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) };
  return {
    service: new OrderTransitionsService(
      prisma as never,
      repository as never,
      placeAccess as never,
      audit as never,
    ),
    repository,
    placeAccess,
    audit,
  };
}

describe('OrderTransitionsService', () => {
  it('conditionally cancels an own PENDING order and audits atomically', async () => {
    const { service, repository, audit } = setup();
    await service.transitionOwn(actor, order.id, { status: 'CANCELLED' });
    expect(repository.updateStatusConditionally).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order.id,
        userId: actor.id,
        expectedStatus: 'PENDING',
        targetStatus: 'CANCELLED',
      }),
      expect.anything(),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDER_STATUS_UPDATED' }),
      expect.anything(),
    );
  });

  it('maps operational targets to their exact permission', async () => {
    const { service, placeAccess } = setup({
      findGlobalDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        ...order,
        status: 'CONFIRMED',
        confirmedAt: now,
      }),
    });
    await service.transitionForPlace(actor, 'place-id', order.id, { status: 'CONFIRMED' });
    expect(placeAccess.assertPermission).toHaveBeenCalledWith(
      actor,
      'place-id',
      'order.confirm',
      expect.anything(),
    );
  });

  it('rejects customer cancellation after PENDING without writing', async () => {
    const confirmed = { ...order, status: 'CONFIRMED' as const, confirmedAt: now };
    const { service, repository } = setup({
      findOwnDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue(confirmed),
    });
    await expect(
      service.transitionOwn(actor, order.id, {
        status: 'CANCELLED',
        cancellationReason: 'changed mind',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.updateStatusConditionally).not.toHaveBeenCalled();
  });

  it('rejects expired PENDING before a scheduler materializes EXPIRED', async () => {
    const { service } = setup({
      findOwnDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        ...order,
        expiresAt: now,
      }),
    });
    await expect(
      service.transitionOwn(actor, order.id, { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a stable conflict when a conditional update loses a race', async () => {
    const { service } = setup({
      updateStatusConditionally: jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 0 }),
      findOwnDetail: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: 'CONFIRMED' }),
    });
    await expect(
      service.transitionOwn(actor, order.id, { status: 'CANCELLED' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
