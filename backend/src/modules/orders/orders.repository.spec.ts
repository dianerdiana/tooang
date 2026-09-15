import { jest } from '@jest/globals';

import { OrdersRepository } from './orders.repository';

describe('OrdersRepository lifecycle predicates', () => {
  it('embeds current membership scope in place-order reads', async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const repository = new OrdersRepository({ order: { findFirst } } as never);
    await repository.findPlaceDetail(
      'place-id',
      'order-id',
      { kind: 'membership', actorId: 'actor-id', allowedRoles: ['CASHIER'] },
      { order: { findFirst } } as never,
    );
    const args = findFirst.mock.calls[0][0] as {
      where: { id: string; placeId: string; place: unknown };
    };
    expect(args.where).toEqual({
      id: 'order-id',
      placeId: 'place-id',
      place: {
        members: {
          some: { userId: 'actor-id', role: { in: ['CASHIER'] }, revokedAt: null },
        },
      },
    });
  });

  it('uses mutually exclusive pending time predicates for interaction and expiry', async () => {
    const updateMany = jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 1 });
    const repository = new OrdersRepository({} as never);
    const now = new Date('2026-09-15T00:00:00Z');
    const db = { order: { updateMany } } as never;

    await repository.updateStatusConditionally(
      {
        orderId: 'order-id',
        userId: 'actor-id',
        expectedStatus: 'PENDING',
        targetStatus: 'CONFIRMED',
        now,
        data: { status: 'CONFIRMED' },
      },
      db,
    );
    let args = updateMany.mock.calls[0][0] as {
      where: { expiresAt: unknown; userId?: string };
    };
    expect(args.where.expiresAt).toEqual({ gt: now });
    expect(args.where.userId).toBe('actor-id');

    await repository.updateStatusConditionally(
      {
        orderId: 'order-id',
        expectedStatus: 'PENDING',
        targetStatus: 'EXPIRED',
        now,
        data: { status: 'EXPIRED' },
      },
      db,
    );
    args = updateMany.mock.calls[1][0] as { where: { expiresAt: unknown } };
    expect(args.where.expiresAt).toEqual({ lte: now });
  });

  it('selects verification records with disabled and terminal-retention filters', async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const repository = new OrdersRepository({ order: { findFirst } } as never);
    await repository.findPublicVerification('A'.repeat(43), new Date('2026-09-15T00:00:00Z'));
    const args = findFirst.mock.calls[0][0] as {
      where: { verificationToken: string; verificationDisabledAt: null; OR: unknown[] };
      select: Record<string, unknown>;
    };
    expect(args.where).toMatchObject({
      verificationToken: 'A'.repeat(43),
      verificationDisabledAt: null,
    });
    expect(args.where.OR).toHaveLength(4);
    expect(args.where.OR[1]).toEqual({
      status: 'COMPLETED',
      completedAt: { gt: new Date('2026-08-16T00:00:00.000Z') },
    });
    expect(args.select).not.toHaveProperty('verificationToken');
    expect(args.select).not.toHaveProperty('customerName');
  });
});
