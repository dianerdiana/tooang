import { describe, expect, it, vi } from 'vitest';

import type { QueryClient } from '@tanstack/react-query';

import { orderDetailKeys } from './order-detail.query';
import { placeOrderListKey, refreshPlaceOrderData } from './order-transition.mutation';

describe('order transition cache refresh', () => {
  it('refreshes the affected place lists and protected detail', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await refreshPlaceOrderData(client, 'place-1', 'order-1');

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-1') });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderDetailKeys.placeOrder('place-1', 'order-1') });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-2') });
  });
});
