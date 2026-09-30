import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import { ORDER_STATUS, type OrderDetailScope, type OrderStatus } from '../types/order.type';

import { ORDER_REFRESH_INTERVAL } from './order-list.query';

const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
]);

export const shouldPollOrderDetail = (status?: OrderStatus) =>
  status !== undefined && ACTIVE_ORDER_STATUSES.has(status);

export const orderDetailKeys = {
  all: ['orders', 'detail'] as const,
  place: (placeId: string) => [...orderDetailKeys.all, 'place', placeId] as const,
  placeOrder: (placeId: string, orderId: string) => [...orderDetailKeys.place(placeId), orderId] as const,
  platform: () => [...orderDetailKeys.all, 'platform'] as const,
  platformOrder: (orderId: string) => [...orderDetailKeys.platform(), orderId] as const,
  own: () => [...orderDetailKeys.all, 'own'] as const,
  ownOrder: (orderId: string) => [...orderDetailKeys.own(), orderId] as const,
};

export const orderDetailQueryKey = (scope: OrderDetailScope, orderId: string | null) =>
  scope.kind === 'place'
    ? orderDetailKeys.placeOrder(scope.placeId, orderId ?? 'disabled')
    : scope.kind === 'own'
      ? orderDetailKeys.ownOrder(orderId ?? 'disabled')
      : orderDetailKeys.platformOrder(orderId ?? 'disabled');

export const orderDetailQueryOptions = (scope: OrderDetailScope, orderId: string | null) =>
  queryOptions({
    queryKey: orderDetailQueryKey(scope, orderId),
    queryFn: () => {
      if (!orderId) throw new Error('An order identifier is required');
      return scope.kind === 'place'
        ? ordersService.getForPlace(scope.placeId, orderId)
        : scope.kind === 'own'
          ? ordersService.getOwn(orderId)
          : ordersService.getGlobal(orderId);
    },
    enabled: orderId !== null,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

export const placeOrderDetailQueryOptions = (placeId: string, orderId: string | null) =>
  orderDetailQueryOptions({ kind: 'place', placeId }, orderId);

export const ownOrderDetailQueryOptions = (orderId: string | null) =>
  queryOptions({
    ...orderDetailQueryOptions({ kind: 'own' }, orderId),
    refetchInterval: (query) => (shouldPollOrderDetail(query.state.data?.status) ? ORDER_REFRESH_INTERVAL : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (query) => shouldPollOrderDetail(query.state.data?.status),
  });
