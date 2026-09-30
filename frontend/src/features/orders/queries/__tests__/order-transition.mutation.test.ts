import { describe, expect, it, vi } from 'vitest';

import type { QueryClient } from '@tanstack/react-query';

import { orderDetailKeys } from '../order-detail.query';
import {
  placeOrderListKey,
  platformOrderListKey,
  refreshOwnOrderData,
  refreshPlaceOrderData,
  refreshScopedOrderData,
  shouldRefreshAfterOwnCancellationError,
} from '../order-transition.mutation';

describe('order transition cache refresh', () => {
  it('refreshes the affected place lists and protected detail', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await refreshPlaceOrderData(client, 'place-1', 'order-1');

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-1') });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderDetailKeys.placeOrder('place-1', 'order-1') });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-2') });
  });

  it('refreshes only platform list and detail keys for global inspection', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await refreshScopedOrderData(client, { kind: 'platform' }, 'order-1');

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: platformOrderListKey() });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: orderDetailKeys.platformOrder('order-1'),
      exact: true,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-1') });
  });

  it('refreshes every own list variant and only the affected own detail', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await refreshOwnOrderData(client, 'order-1');

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders', 'list', 'own'] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: orderDetailKeys.ownOrder('order-1'),
      exact: true,
    });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: orderDetailKeys.ownOrder('order-2'), exact: true });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: platformOrderListKey() });
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: placeOrderListKey('place-1') });
  });

  it('refreshes authoritative own data after uncertain or stale cancellation failures', () => {
    expect(
      shouldRefreshAfterOwnCancellationError({
        error: true,
        message: 'Network unavailable',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
      }),
    ).toBe(true);
    expect(
      shouldRefreshAfterOwnCancellationError({
        error: true,
        message: 'Changed',
        code: 'ORDER_STATUS_CHANGED',
        httpStatus: 409,
        isNetworkError: false,
      }),
    ).toBe(true);
    expect(
      shouldRefreshAfterOwnCancellationError({
        error: true,
        message: 'Invalid input',
        code: 'VALIDATION_ERROR',
        httpStatus: 400,
        isNetworkError: false,
      }),
    ).toBe(false);
  });
});
