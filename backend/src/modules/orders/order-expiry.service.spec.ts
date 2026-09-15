import { jest } from '@jest/globals';

import { OrderExpiryService } from './order-expiry.service';

describe('OrderExpiryService', () => {
  it('drains bounded batches and stops on a partial batch', async () => {
    const repository = {
      expirePendingBatch: jest
        .fn<(limit: number) => Promise<string[]>>()
        .mockResolvedValueOnce(Array.from({ length: 100 }, (_, index) => `${index}`))
        .mockResolvedValueOnce(['last']),
    };
    const result = await new OrderExpiryService(repository as never).runCycle();
    expect(result).toEqual({ batches: 2, expired: 101, capped: false });
    expect(repository.expirePendingBatch).toHaveBeenCalledWith(100);
  });

  it('caps work at ten full batches', async () => {
    const repository = {
      expirePendingBatch: jest
        .fn<(limit: number) => Promise<string[]>>()
        .mockResolvedValue(Array.from({ length: 100 }, (_, index) => `${index}`)),
    };
    await expect(new OrderExpiryService(repository as never).runCycle()).resolves.toEqual({
      batches: 10,
      expired: 1000,
      capped: true,
    });
  });
});
