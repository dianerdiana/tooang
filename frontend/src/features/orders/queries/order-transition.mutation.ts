import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import type { OperationalOrderStatusInput, OrderDetailScope } from '../types/order.type';

import { orderDetailKeys, orderDetailQueryKey } from './order-detail.query';

export const placeOrderListKey = (placeId: string) => ['orders', 'list', 'place', placeId] as const;
export const platformOrderListKey = () => ['orders', 'list', 'platform'] as const;
export const ownOrderListKey = () => ['orders', 'list', 'own'] as const;

export const refreshPlaceOrderData = async (client: QueryClient, placeId: string, orderId: string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: placeOrderListKey(placeId) }),
    client.invalidateQueries({ queryKey: orderDetailKeys.placeOrder(placeId, orderId) }),
  ]);
};

export const refreshScopedOrderData = async (client: QueryClient, scope: OrderDetailScope, orderId: string) => {
  await Promise.all([
    client.invalidateQueries({
      queryKey:
        scope.kind === 'place'
          ? placeOrderListKey(scope.placeId)
          : scope.kind === 'own'
            ? ownOrderListKey()
            : platformOrderListKey(),
    }),
    client.invalidateQueries({ queryKey: orderDetailQueryKey(scope, orderId) }),
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
