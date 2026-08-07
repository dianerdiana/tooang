import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import type { OperationalOrderStatusInput } from '../types/order.type';

import { orderDetailKeys } from './order-detail.query';

export const placeOrderListKey = (placeId: string) => ['orders', 'list', 'place', placeId] as const;

export const refreshPlaceOrderData = async (client: QueryClient, placeId: string, orderId: string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: placeOrderListKey(placeId) }),
    client.invalidateQueries({ queryKey: orderDetailKeys.placeOrder(placeId, orderId) }),
  ]);
};

export const usePlaceOrderTransitionMutation = (placeId: string, orderId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OperationalOrderStatusInput) => ordersService.transitionForPlace(placeId, orderId, input),
    onSuccess: async (order) => {
      client.setQueryData(orderDetailKeys.placeOrder(placeId, orderId), order);
      await refreshPlaceOrderData(client, placeId, orderId);
    },
  });
};
