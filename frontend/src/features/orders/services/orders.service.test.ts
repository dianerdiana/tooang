import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { ordersService } from './orders.service';

const response = {
  data: {
    error: false,
    message: 'Orders retrieved',
    data: { orders: [] },
    meta: { page: 1, limit: 1, totalItems: 7, totalPages: 7 },
  },
};

describe('ordersService', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue(response);
  });

  it('lists status-filtered orders for one place', async () => {
    await expect(ordersService.listForPlace('place-1', { page: 1, limit: 1, status: 'PENDING' })).resolves.toEqual({
      orders: [],
      meta: response.data.meta,
    });

    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/orders', {
      params: { page: 1, limit: 1, status: 'PENDING' },
    });
  });

  it('uses the global orders endpoint for platform scope', async () => {
    await ordersService.list({ kind: 'platform' }, { page: 1, limit: 5 });

    expect(apiMock.get).toHaveBeenCalledWith('/orders', { params: { page: 1, limit: 5 } });
  });

  it('normalizes API failures for callers', async () => {
    apiMock.get.mockRejectedValue(new Error('Orders unavailable'));

    await expect(ordersService.listGlobal({ page: 1, limit: 5 })).rejects.toMatchObject({
      error: true,
      message: 'Orders unavailable',
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    });
  });
});
