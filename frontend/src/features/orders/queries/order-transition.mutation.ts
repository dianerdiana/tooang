import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { isApplicationError } from '@/utils/api-error.util';

import { ordersService } from '../services/orders.service';
import type { OperationalOrderStatusInput, OrderDetailScope } from '../types/order.type';

import { orderDetailKeys, orderDetailQueryKey } from './order-detail.query';
import { orderListKeys } from './order-list.query';

export const placeOrderListKey = orderListKeys.place;
export const platformOrderListKey = orderListKeys.platform;
export const ownOrderListKey = orderListKeys.own;

export const refreshOwnOrderLists = (client: QueryClient) =>
  client.invalidateQueries({ queryKey: orderListKeys.own() });

export const refreshOwnOrderDetail = (client: QueryClient, orderId: string) =>
  client.invalidateQueries({ queryKey: orderDetailKeys.ownOrder(orderId), exact: true });

export const refreshOwnOrderData = async (client: QueryClient, orderId: string) => {
  await Promise.all([refreshOwnOrderLists(client), refreshOwnOrderDetail(client, orderId)]);
};

export const ownOrderCancellationMutationKey = (orderId: string) => ['orders', 'cancel', 'own', orderId] as const;

export const shouldRefreshAfterOwnCancellationError = (error: unknown) =>
  isApplicationError(error) && (error.isNetworkError || error.httpStatus === 404 || error.httpStatus === 409);

export const useOwnOrderCancellationMutation = (orderId: string) => {
  const client = useQueryClient();

  return useMutation({
    mutationKey: ownOrderCancellationMutationKey(orderId),
    mutationFn: (cancellationReason?: string | null) => ordersService.transitionOwn(orderId, cancellationReason),
    onSuccess: async (order) => {
      client.setQueryData(orderDetailKeys.ownOrder(orderId), order);
      await refreshOwnOrderData(client, orderId);
    },
    onError: async (error) => {
      if (shouldRefreshAfterOwnCancellationError(error)) await refreshOwnOrderData(client, orderId);
    },
  });
};

export const refreshPlaceOrderData = async (client: QueryClient, placeId: string, orderId: string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: placeOrderListKey(placeId) }),
    client.invalidateQueries({ queryKey: orderDetailKeys.placeOrder(placeId, orderId) }),
  ]);
};

export const refreshScopedOrderData = async (client: QueryClient, scope: OrderDetailScope, orderId: string) => {
  if (scope.kind === 'own') {
    await refreshOwnOrderData(client, orderId);
    return;
  }

  await Promise.all([
    client.invalidateQueries({
      queryKey: scope.kind === 'place' ? placeOrderListKey(scope.placeId) : platformOrderListKey(),
    }),
    client.invalidateQueries({ queryKey: orderDetailQueryKey(scope, orderId), exact: true }),
  ]);
};

export const useScopedOrderTransitionMutation = (
  scope: OrderDetailScope,
  transitionPlaceId: string,
  orderId: string,
) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OperationalOrderStatusInput) => {
      if (scope.kind === 'own') {
        if (input.status !== 'CANCELLED') throw new Error('Customers may only cancel an order');
        return ordersService.transitionOwn(orderId, input.cancellationReason);
      }
      if (!transitionPlaceId) throw new Error('A place identifier is required for an order transition');
      return ordersService.transitionForPlace(transitionPlaceId, orderId, input);
    },
    onSuccess: async (order) => {
      client.setQueryData(orderDetailQueryKey(scope, orderId), order);
      await refreshScopedOrderData(client, scope, orderId);
    },
  });
};

export const usePlaceOrderTransitionMutation = (placeId: string, orderId: string) => {
  return useScopedOrderTransitionMutation({ kind: 'place', placeId }, placeId, orderId);
};
