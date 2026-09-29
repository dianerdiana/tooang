import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { ordersService } from '../orders.service';

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
    apiMock.post.mockReset();
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

  it('uses only actor-scoped endpoints for personal order reads and cancellation', async () => {
    await ordersService.list({ kind: 'own' }, { page: 1, limit: 20 });
    const order = { orderId: 'order/1', status: 'PENDING' };
    apiMock.get.mockResolvedValueOnce({ data: { error: false, message: 'Order retrieved', data: { order } } });
    apiMock.patch.mockResolvedValueOnce({
      data: { error: false, message: 'Order updated', data: { order: { ...order, status: 'CANCELLED' } } },
    });
    await ordersService.getOwn('order/1');
    await ordersService.transitionOwn('order/1', 'Changed plans');
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/me/orders', { params: { page: 1, limit: 20 } });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/me/orders/order%2F1');
    expect(apiMock.patch).toHaveBeenCalledWith('/me/orders/order%2F1/status', {
      status: 'CANCELLED',
      cancellationReason: 'Changed plans',
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

  it('loads manual options and creates with a caller-stable idempotency key', async () => {
    const options = { categories: [], tables: [] };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Options retrieved', data: { options } },
    });
    await expect(ordersService.getManualOrderOptions('place/1')).resolves.toEqual(options);
    expect(apiMock.get).toHaveBeenCalledWith('/places/place%2F1/orders/manual-options');

    const order = { orderId: 'manual-1', status: 'CONFIRMED', source: 'MANUAL' };
    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Manual order created', data: { order } },
    });
    const input = {
      fulfillmentType: 'TAKEAWAY' as const,
      customerName: 'Ayu',
      items: [{ menuItemId: 'item-1', quantity: 2 }],
    };
    await expect(ordersService.createManual('place/1', input, 'stable-key')).resolves.toEqual(order);
    expect(apiMock.post).toHaveBeenCalledWith('/places/place%2F1/orders/manual', input, {
      headers: { 'Idempotency-Key': 'stable-key' },
    });
  });

  it('checks out with the exact customer body and caller-managed header', async () => {
    const input = {
      placeId: '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE',
      fulfillmentType: 'TAKEAWAY' as const,
      customerName: '  Ayu   Lestari ',
      customerNote: '  No plastic ',
    };
    const order = {
      orderId: '123e4567-e89b-42d3-a456-426614174000',
      orderCode: 'TNG-20260929-ABCDEFGH',
      placeId: input.placeId.toLowerCase(),
      status: 'PENDING',
    };
    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Order created', data: { order } },
    });

    await expect(ordersService.checkout(input, 'checkout:key-1')).resolves.toEqual(order);
    expect(apiMock.post).toHaveBeenCalledWith(
      '/me/orders',
      {
        placeId: input.placeId.toLowerCase(),
        fulfillmentType: 'TAKEAWAY',
        customerName: 'Ayu Lestari',
        customerNote: 'No plastic',
      },
      { headers: { 'Idempotency-Key': 'checkout:key-1' } },
    );

    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Order created', data: { order: { ...order, fulfillmentType: 'DINE_IN' } } },
    });
    await ordersService.checkout(
      {
        placeId: input.placeId,
        fulfillmentType: 'DINE_IN',
        tableId: '123E4567-E89B-42D3-A456-426614174000',
        customerName: 'Ayu',
      },
      'checkout:key-2',
    );
    expect(apiMock.post).toHaveBeenLastCalledWith(
      '/me/orders',
      {
        placeId: input.placeId.toLowerCase(),
        fulfillmentType: 'DINE_IN',
        tableId: '123e4567-e89b-42d3-a456-426614174000',
        customerName: 'Ayu',
      },
      { headers: { 'Idempotency-Key': 'checkout:key-2' } },
    );
  });

  it('normalizes checkout transport failures', async () => {
    apiMock.post.mockRejectedValueOnce(new Error('Checkout unavailable'));

    await expect(
      ordersService.checkout(
        {
          placeId: '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae',
          fulfillmentType: 'TAKEAWAY',
          customerName: 'Ayu',
        },
        'checkout-key',
      ),
    ).rejects.toMatchObject({ code: 'APPLICATION_ERROR', isNetworkError: false });
  });
});
