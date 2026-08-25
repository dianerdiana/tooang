import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import type { OrderDetailScope } from '../types/order.type';

export const orderDetailKeys = {
  all: ['orders', 'detail'] as const,
  place: (placeId: string) => [...orderDetailKeys.all, 'place', placeId] as const,
  placeOrder: (placeId: string, orderId: string) => [...orderDetailKeys.place(placeId), orderId] as const,
  platform: () => [...orderDetailKeys.all, 'platform'] as const,
  platformOrder: (orderId: string) => [...orderDetailKeys.platform(), orderId] as const,
};

export const orderDetailQueryKey = (scope: OrderDetailScope, orderId: string | null) =>
  scope.kind === 'place'
    ? orderDetailKeys.placeOrder(scope.placeId, orderId ?? 'disabled')
    : orderDetailKeys.platformOrder(orderId ?? 'disabled');

export const orderDetailQueryOptions = (scope: OrderDetailScope, orderId: string | null) =>
  queryOptions({
    queryKey: orderDetailQueryKey(scope, orderId),
    queryFn: () => {
      if (!orderId) throw new Error('An order identifier is required');
      return scope.kind === 'place'
        ? ordersService.getForPlace(scope.placeId, orderId)
        : ordersService.getGlobal(orderId);
    },
    enabled: orderId !== null,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

export const placeOrderDetailQueryOptions = (placeId: string, orderId: string | null) =>
  orderDetailQueryOptions({ kind: 'place', placeId }, orderId);
