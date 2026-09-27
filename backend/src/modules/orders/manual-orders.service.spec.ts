import { ConflictException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { hashManualOrderInput } from './checkout-identity';
import { ManualOrdersService } from './manual-orders.service';

const now = new Date('2026-09-27T06:00:00.000Z');
const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: 'USER' as const };
const placeId = '11111111-1111-4111-8111-111111111111';
const menuItemId = '22222222-2222-4222-8222-222222222222';
const input = {
  fulfillmentType: 'TAKEAWAY' as const,
  customerName: 'Ayu',
  items: [{ menuItemId, quantity: 2 }],
};

describe('ManualOrdersService', () => {
  let repository: Record<string, jest.Mock>;
  let service: ManualOrdersService;

  beforeEach(() => {
    const detail = {
      id: 'order-id',
      orderCode: 'TNG-20260927-ABCDEFGH',
      source: 'MANUAL',
      status: 'CONFIRMED',
      fulfillmentType: 'TAKEAWAY',
      customerName: 'Ayu',
      diningTableName: null,
      subtotal: new Prisma.Decimal(25_000),
      createdAt: now,
      statusUpdatedAt: now,
      expiresAt: new Date(now.getTime() + 900_000),
      place: { id: placeId, name: 'Warung' },
      createdBy: { userId: actor.userId, fullName: 'Cashier' },
      customerNote: null,
      cancellationReason: null,
      diningTableId: null,
      confirmedAt: now,
      completedAt: null,
      cancelledAt: null,
      items: [
        {
          id: 'line-id',
          menuItemId,
          itemName: 'Nasi Goreng',
          itemType: 'FOOD',
          unitPrice: new Prisma.Decimal(12_500),
          quantity: 2,
          note: null,
          lineTotal: new Prisma.Decimal(25_000),
        },
      ],
    };
    repository = {
      acquireIdempotencyLock: jest.fn().mockResolvedValue(undefined),
      databaseNow: jest.fn().mockResolvedValue([{ now }]),
      findIdempotency: jest.fn().mockResolvedValue(null),
      deleteIdempotency: jest.fn().mockResolvedValue(undefined),
      lockActiveUser: jest.fn().mockResolvedValue(true),
      lockManualOrderState: jest.fn().mockResolvedValue(undefined),
      findManualOrderItems: jest.fn().mockResolvedValue([
        {
          id: menuItemId,
          placeId,
          name: 'Nasi Goreng',
          type: 'FOOD',
          price: new Prisma.Decimal(12_500),
          isAvailable: true,
          deletedAt: null,
          category: { placeId, isActive: true, deletedAt: null },
        },
      ]),
      findDiningTable: jest.fn().mockResolvedValue(null),
      createOrder: jest.fn().mockResolvedValue({ id: 'order-id' }),
      findOrderDetail: jest.fn().mockResolvedValue(detail),
      createIdempotency: jest.fn().mockResolvedValue({}),
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})),
    };
    const codes = {
      orderCode: jest.fn().mockReturnValue('TNG-20260927-ABCDEFGH'),
      verificationToken: jest.fn().mockReturnValue('verification-token'),
    };
    const access = { assertPermission: jest.fn().mockResolvedValue({ source: 'membership' }) };
    const audit = { append: jest.fn().mockResolvedValue({}) };
    service = new ManualOrdersService(
      prisma as never,
      repository as never,
      codes as never,
      access as never,
      audit as never,
    );
  });

  it('creates a confirmed manual order from server-owned menu snapshots', async () => {
    const result = await service.create(actor, placeId, 'manual-request-1', input);
    expect(result.status).toBe(201);
    expect(repository.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'MANUAL',
        status: 'CONFIRMED',
        customerName: 'Ayu',
        createdBy: { connect: { id: actor.id } },
        confirmedAt: now,
        verificationDisabledAt: now,
      }),
      expect.anything(),
    );
    const createInput = repository.createOrder.mock.calls[0][0] as Record<string, unknown>;
    expect(createInput).not.toHaveProperty('user');
    expect(repository.createIdempotency).toHaveBeenCalled();
  });

  it('rejects unavailable items before writing an order', async () => {
    repository.findManualOrderItems.mockResolvedValue([]);
    await expect(service.create(actor, placeId, 'manual-request-2', input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.createOrder).not.toHaveBeenCalled();
  });

  it('replays an idempotent response without creating another order', async () => {
    const firstHash = hashManualOrderInput(placeId, input);
    repository.findIdempotency.mockResolvedValue({
      id: 'idempotency-id',
      requestHash: firstHash,
      responseStatus: 201,
      responseBody: { replayed: true },
      expiresAt: new Date(now.getTime() + 60_000),
    });
    await expect(service.create(actor, placeId, 'manual-request-3', input)).resolves.toEqual({
      status: 201,
      body: { replayed: true },
    });
    expect(repository.createOrder).not.toHaveBeenCalled();
  });
});
