import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
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
    apiMock.patch.mockReset();
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
    await ordersService.list(
      { kind: 'platform' },
      { page: 1, limit: 5, placeId: '00000000-0000-4000-8000-000000000001' },
    );

    expect(apiMock.get).toHaveBeenCalledWith('/orders', {
      params: { page: 1, limit: 5, placeId: '00000000-0000-4000-8000-000000000001' },
    });
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

  it('gets protected operational detail without using public verification', async () => {
    const order = { orderId: 'order/1', status: 'PENDING' };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Order retrieved', data: { order } },
    });

    await expect(ordersService.getForPlace('place/1', 'order/1')).resolves.toEqual(order);
    expect(apiMock.get).toHaveBeenCalledWith('/places/place%2F1/orders/order%2F1');
    expect(apiMock.get.mock.calls[0]?.[0]).not.toContain('order-verifications');
  });

  it('gets protected global detail from the global endpoint', async () => {
    const order = { orderId: 'order/1', status: 'READY' };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Order retrieved', data: { order } },
    });

    await expect(ordersService.getGlobal('order/1')).resolves.toEqual(order);
    expect(apiMock.get).toHaveBeenCalledWith('/orders/order%2F1');
  });

  it('transitions through the authenticated place endpoint with the exact input', async () => {
    const order = { orderId: 'order-1', status: 'CANCELLED' };
    apiMock.patch.mockResolvedValueOnce({
      data: { error: false, message: 'Order status updated', data: { order } },
    });

    await expect(
      ordersService.transitionForPlace('place-1', 'order-1', {
        status: 'CANCELLED',
        cancellationReason: 'Kitchen closed',
      }),
    ).resolves.toEqual(order);
    expect(apiMock.patch).toHaveBeenCalledWith('/places/place-1/orders/order-1/status', {
      status: 'CANCELLED',
      cancellationReason: 'Kitchen closed',
    });
  });
});
