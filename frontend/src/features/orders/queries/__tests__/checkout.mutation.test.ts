import { describe, expect, it, vi } from 'vitest';

import type { QueryClient } from '@tanstack/react-query';

import { cartKeys } from '@/features/cart/queries/cart.query';
import { placesKeys } from '@/features/places/queries/places.key';

import { fingerprintCheckoutInput } from '../../utils/checkout-attempt';
import {
  applyCheckoutSuccess,
  createCheckoutRequestGate,
  emptyCartForPlace,
  refreshAfterCheckoutError,
} from '../checkout.mutation';
import { orderDetailKeys } from '../order-detail.query';
import { ownOrderListKey } from '../order-transition.mutation';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const input = { placeId, fulfillmentType: 'TAKEAWAY' as const, customerName: 'Ayu' };
const order = {
  orderId: '123e4567-e89b-42d3-a456-426614174000',
  orderCode: 'TNG-20260929-ABCDEFGH',
  placeId,
  status: 'PENDING' as const,
  fulfillmentType: 'TAKEAWAY' as const,
  customerName: 'Ayu',
  customerNote: null,
  diningTable: null,
  items: [],
  subtotal: 0,
  createdAt: '2026-09-29T00:00:00.000Z',
  statusUpdatedAt: '2026-09-29T00:00:00.000Z',
  expiresAt: '2026-09-29T00:15:00.000Z',
};

describe('checkout mutation lifecycle', () => {
  it('coalesces identical in-flight requests but not a changed payload', async () => {
    let resolveRequest: (value: typeof order) => void = () => undefined;
    const request = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<typeof order>((resolve) => {
            resolveRequest = resolve;
          }),
      )
      .mockResolvedValueOnce(order);
    const gated = createCheckoutRequestGate(request);
    const fingerprint = await fingerprintCheckoutInput(input);
    const attempt = { idempotencyKey: 'attempt-1', fingerprint };
    const first = gated({ input, attempt });
    const duplicate = gated({ input: { ...input }, attempt });
    const changed = gated({ input: { ...input, customerName: 'Budi' }, attempt });

    await expect(changed).rejects.toMatchObject({ code: 'CHECKOUT_ATTEMPT_MISMATCH' });
    expect(request).toHaveBeenCalledTimes(1);
    resolveRequest(order);
    await Promise.all([first, duplicate]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('empties only the confirmed cart and refreshes own order caches', async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { setQueryData, invalidateQueries } as unknown as QueryClient;

    await applyCheckoutSuccess(client, order);

    expect(setQueryData).toHaveBeenCalledWith(cartKeys.place(placeId), emptyCartForPlace(placeId));
    expect(setQueryData).not.toHaveBeenCalledWith(
      cartKeys.place('00000000-0000-4000-8000-000000000001'),
      expect.anything(),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ownOrderListKey() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: orderDetailKeys.ownOrder(order.orderId), exact: true });
  });

  it('refreshes cart and place for state conflicts without clearing cached data', async () => {
    const setQueryData = vi.fn();
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { setQueryData, invalidateQueries } as unknown as QueryClient;
    const error = {
      error: true as const,
      message: 'Closed',
      code: 'PLACE_CLOSED',
      httpStatus: 409,
      isNetworkError: false,
    };

    await refreshAfterCheckoutError(client, placeId, 'warung-kita', error);

    expect(setQueryData).not.toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: cartKeys.place(placeId), exact: true });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: placesKeys.publicDetail('warung-kita'),
      exact: true,
    });
  });

  it('refreshes cart and own lists after an uncertain network outcome', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;
    await refreshAfterCheckoutError(client, placeId, 'warung-kita', {
      error: true,
      message: 'Network unavailable',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: cartKeys.place(placeId), exact: true });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ownOrderListKey() });
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: placesKeys.publicDetail('warung-kita'),
      exact: true,
    });
  });

  it('targets only the cart for cart conflicts and leaves caches intact for a reused key', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const client = { invalidateQueries } as unknown as QueryClient;

    await refreshAfterCheckoutError(client, placeId, 'warung-kita', {
      error: true,
      message: 'Cart empty',
      code: 'CART_EMPTY',
      httpStatus: 409,
      isNetworkError: false,
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: cartKeys.place(placeId), exact: true });

    invalidateQueries.mockClear();
    await refreshAfterCheckoutError(client, placeId, 'warung-kita', {
      error: true,
      message: 'Key reused',
      code: 'IDEMPOTENCY_KEY_REUSED',
      httpStatus: 409,
      isNetworkError: false,
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
