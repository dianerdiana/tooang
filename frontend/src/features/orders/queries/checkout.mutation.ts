import { useRef } from 'react';

import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { cartKeys } from '@/features/cart/queries/cart.query';
import type { Cart } from '@/features/cart/types/cart.type';
import { placesKeys } from '@/features/places/queries/places.key';

import { isApplicationError } from '@/utils/api-error.util';

import { checkoutInputSchema, idempotencyKeySchema } from '../schemas/checkout.schema';
import { ordersService } from '../services/orders.service';
import type { CheckoutMutationVariables, CheckoutOrder } from '../types/order.type';

import { orderDetailKeys } from './order-detail.query';
import { ownOrderListKey } from './order-transition.mutation';

export const checkoutMutationKey = (placeId: string) => ['orders', 'checkout', placeId] as const;

const cartRefreshCodes = new Set([
  'CART_EMPTY',
  'CART_ITEM_INVALID',
  'ORDER_TOTAL_OUT_OF_RANGE',
  'CHECKOUT_CONCURRENT_MODIFICATION',
]);

const placeRefreshCodes = new Set(['PLACE_UNAVAILABLE', 'ORDERING_DISABLED', 'PLACE_CLOSED']);

export const emptyCartForPlace = (placeId: string): Cart => ({
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
});

export const applyCheckoutSuccess = async (client: QueryClient, order: CheckoutOrder) => {
  client.setQueryData(cartKeys.place(order.placeId), emptyCartForPlace(order.placeId));
  await Promise.all([
    client.invalidateQueries({ queryKey: cartKeys.place(order.placeId), exact: true }),
    client.invalidateQueries({ queryKey: ownOrderListKey() }),
    client.invalidateQueries({ queryKey: orderDetailKeys.ownOrder(order.orderId), exact: true }),
  ]);
};

export const refreshAfterCheckoutError = async (
  client: QueryClient,
  placeId: string,
  placeSlug: string,
  error: unknown,
) => {
  if (!isApplicationError(error)) return;

  const work: Promise<unknown>[] = [];
  const refreshCart =
    error.isNetworkError ||
    error.httpStatus === 404 ||
    cartRefreshCodes.has(error.code) ||
    placeRefreshCodes.has(error.code);
  const refreshPlace = error.httpStatus === 404 || placeRefreshCodes.has(error.code);

  if (refreshCart) work.push(client.invalidateQueries({ queryKey: cartKeys.place(placeId), exact: true }));
  if (refreshPlace) work.push(client.invalidateQueries({ queryKey: placesKeys.publicDetail(placeSlug), exact: true }));
  if (error.isNetworkError) work.push(client.invalidateQueries({ queryKey: ownOrderListKey() }));

  await Promise.all(work);
};

type CheckoutRequest = (variables: CheckoutMutationVariables) => Promise<CheckoutOrder>;

export const createCheckoutRequestGate = (request: CheckoutRequest): CheckoutRequest => {
  const inFlight = new Map<string, Promise<CheckoutOrder>>();

  return (variables) => {
    const input = checkoutInputSchema.parse(variables.input);
    const idempotencyKey = idempotencyKeySchema.parse(variables.idempotencyKey);
    const fingerprint = `${idempotencyKey}:${JSON.stringify(input)}`;
    const pending = inFlight.get(fingerprint);
    if (pending) return pending;

    const promise = request({ input, idempotencyKey }).finally(() => {
      if (inFlight.get(fingerprint) === promise) inFlight.delete(fingerprint);
    });
    inFlight.set(fingerprint, promise);
    return promise;
  };
};

export const useCheckoutMutation = (placeId: string, placeSlug: string) => {
  const client = useQueryClient();
  const requestRef = useRef<CheckoutRequest | null>(null);
  requestRef.current ??= createCheckoutRequestGate(({ input, idempotencyKey }) =>
    ordersService.checkout(input, idempotencyKey),
  );

  return useMutation({
    mutationKey: checkoutMutationKey(placeId),
    mutationFn: (variables: CheckoutMutationVariables) => requestRef.current!(variables),
    onSuccess: (order) => applyCheckoutSuccess(client, order),
    onError: (error) => refreshAfterCheckoutError(client, placeId, placeSlug, error),
  });
};
