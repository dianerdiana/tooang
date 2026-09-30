import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import { ORDER_STATUS, type OrderListParams, type OrderListScope, type OrderStatus } from '../types/order.type';

export const ORDER_REFRESH_INTERVAL = 30_000;

const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
]);

export const shouldPollOrderList = (params: OrderListParams) =>
  params.status === undefined || ACTIVE_ORDER_STATUSES.has(params.status);

const normalizedParams = (scope: OrderListScope | null, params: OrderListParams) => ({
  page: params.page ?? 1,
  limit: params.limit ?? 20,
  ...(params.status ? { status: params.status } : {}),
  ...(params.fulfillmentType ? { fulfillmentType: params.fulfillmentType } : {}),
  ...(scope?.kind !== 'place' && params.placeId ? { placeId: params.placeId } : {}),
});

export const orderListKeys = {
  all: ['orders', 'list'] as const,
  place: (placeId: string) => [...orderListKeys.all, 'place', placeId] as const,
  platform: () => [...orderListKeys.all, 'platform'] as const,
  own: () => [...orderListKeys.all, 'own'] as const,
};

export const orderListQueryKey = (scope: OrderListScope | null, params: OrderListParams) =>
  [
    'orders',
    'list',
    scope?.kind ?? 'disabled',
    scope?.kind === 'place' ? scope.placeId : null,
    normalizedParams(scope, params),
  ] as const;

export const orderListQueryOptions = (scope: OrderListScope | null, params: OrderListParams) =>
  queryOptions({
    queryKey: orderListQueryKey(scope, params),
    queryFn: () => {
      if (!scope) throw new Error('An order-list scope is required');
      return ordersService.list(scope, normalizedParams(scope, params));
    },
    enabled: scope !== null,
    staleTime: 15_000,
    refetchInterval: shouldPollOrderList(normalizedParams(scope, params)) ? ORDER_REFRESH_INTERVAL : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: shouldPollOrderList(normalizedParams(scope, params)),
  });

export const ownOrderListQueryOptions = (params: OrderListParams) =>
  queryOptions({
    ...orderListQueryOptions({ kind: 'own' }, params),
    placeholderData: keepPreviousData,
  });
