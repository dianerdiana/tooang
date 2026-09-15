import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { OrderQueriesService } from './order-queries.service';

const user = { id: 'actor-id', userId: 'usr_actor', platformRole: 'USER' as const };
const admin = { id: 'admin-id', userId: 'usr_admin', platformRole: 'ADMIN' as const };
const input = { page: 1, limit: 20 };

describe('OrderQueriesService', () => {
  it('always derives own-order scope from the actor', async () => {
    const repository = {
      listOwn: jest.fn<() => Promise<unknown>>().mockResolvedValue({ orders: [], totalItems: 0 }),
    };
    const service = new OrderQueriesService(repository as never, {} as never);
    await expect(service.listOwn(admin, input)).resolves.toMatchObject({
      orders: [],
      meta: { totalItems: 0 },
    });
    expect(repository.listOwn).toHaveBeenCalledWith(admin.id, input);
  });

  it('requires an explicit global order.read scope for global routes', async () => {
    const repository = { listGlobal: jest.fn() };
    const service = new OrderQueriesService(repository as never, {} as never);
    await expect(service.listGlobal(user, input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.listGlobal).not.toHaveBeenCalled();
  });

  it('rechecks membership and passes it into the database order predicate', async () => {
    const repository = {
      listForPlace: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        orders: [],
        totalItems: 0,
      }),
    };
    const placeAccess = {
      assertPermission: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        source: 'membership',
        membershipRole: 'CASHIER',
        permission: 'order.read',
      }),
    };
    const service = new OrderQueriesService(repository as never, placeAccess as never);
    await service.listForPlace(user, 'place-id', input);
    expect(placeAccess.assertPermission).toHaveBeenCalledWith(user, 'place-id', 'order.read');
    expect(repository.listForPlace).toHaveBeenCalledWith(
      'place-id',
      { kind: 'membership', actorId: user.id, allowedRoles: ['CASHIER'] },
      input,
    );
  });

  it('does not reveal a missing or foreign own order', async () => {
    const service = new OrderQueriesService(
      { findOwnDetail: jest.fn<() => Promise<null>>().mockResolvedValue(null) } as never,
      {} as never,
    );
    await expect(service.getOwn(user, 'order-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('serializes Decimal snapshots without leaking repository-only fields', async () => {
    const order = {
      id: 'order-id',
      orderCode: 'TNG-20260915-ABCDEFGH',
      status: 'PENDING',
      fulfillmentType: 'TAKEAWAY',
      customerName: 'Ayu',
      diningTableName: null,
      diningTableId: null,
      customerNote: null,
      cancellationReason: null,
      subtotal: new Prisma.Decimal('10.50'),
      createdAt: new Date('2026-09-15T00:00:00Z'),
      statusUpdatedAt: new Date('2026-09-15T00:00:00Z'),
      expiresAt: new Date('2026-09-15T00:15:00Z'),
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      place: { id: 'place-id', name: 'Place' },
      items: [],
      verificationToken: 'must-not-leak',
    };
    const service = new OrderQueriesService(
      { findOwnDetail: jest.fn<() => Promise<unknown>>().mockResolvedValue(order) } as never,
      {} as never,
    );
    const result = await service.getOwn(user, 'order-id');
    expect(result).toMatchObject({ orderId: 'order-id', subtotal: 10.5 });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });
});
