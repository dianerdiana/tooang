import { jest } from '@jest/globals';

import { OrderExpiryService } from './order-expiry.service';

describe('OrderExpiryService', () => {
  const timestamp = new Date('2026-01-01T00:00:00.000Z');
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${index}`,
      previousStatusUpdatedAt: timestamp,
      statusUpdatedAt: timestamp,
    }));
  const prisma = {
    $transaction: jest.fn((callback: (tx: object) => unknown) => callback({ transaction: true })),
  };
  const audit = { appendMany: jest.fn(() => Promise.resolve()) };

  beforeEach(() => jest.clearAllMocks());

  it('drains bounded batches and stops on a partial batch', async () => {
    const repository = {
      expirePendingBatch: jest
        .fn<() => Promise<ReturnType<typeof rows>>>()
        .mockResolvedValueOnce(rows(100))
        .mockResolvedValueOnce(rows(1)),
    };
    const result = await new OrderExpiryService(
      repository as never,
      prisma as never,
      audit as never,
    ).runCycle();
    expect(result).toEqual({ batches: 2, expired: 101, capped: false });
    expect(repository.expirePendingBatch).toHaveBeenCalledWith(100, expect.any(Object));
    expect(audit.appendMany).toHaveBeenCalledTimes(2);
  });

  it('caps work at ten full batches', async () => {
    const repository = {
      expirePendingBatch: jest
        .fn<() => Promise<ReturnType<typeof rows>>>()
        .mockResolvedValue(rows(100)),
    };
    await expect(
      new OrderExpiryService(repository as never, prisma as never, audit as never).runCycle(),
    ).resolves.toEqual({
      batches: 10,
      expired: 1000,
      capped: true,
    });
  });

  it('rolls back expiry when its audit cannot be appended', async () => {
    const repository = { expirePendingBatch: jest.fn(() => Promise.resolve(rows(1))) };
    const failingAudit = { appendMany: jest.fn(() => Promise.reject(new Error('audit failed'))) };
    await expect(
      new OrderExpiryService(
        repository as never,
        prisma as never,
        failingAudit as never,
      ).runCycle(),
    ).rejects.toThrow('audit failed');
  });
});
