import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';
import type { OrderListParams, OrderListScope } from '../types/order.type';

export const ORDER_REFRESH_INTERVAL = 30_000;

const normalizedParams = (params: OrderListParams) => ({
  page: params.page ?? 1,
  limit: params.limit ?? 20,
  ...(params.status ? { status: params.status } : {}),
  ...(params.fulfillmentType ? { fulfillmentType: params.fulfillmentType } : {}),
});

export const orderListQueryKey = (scope: OrderListScope | null, params: OrderListParams) =>
  [
    'orders',
    'list',
    scope?.kind ?? 'disabled',
    scope?.kind === 'place' ? scope.placeId : null,
    normalizedParams(params),
  ] as const;

export const orderListQueryOptions = (scope: OrderListScope | null, params: OrderListParams) =>
  queryOptions({
    queryKey: orderListQueryKey(scope, params),
    queryFn: () => {
      if (!scope) throw new Error('An order-list scope is required');
      return ordersService.list(scope, normalizedParams(params));
    },
    enabled: scope !== null,
    staleTime: 15_000,
    refetchInterval: ORDER_REFRESH_INTERVAL,
    refetchOnWindowFocus: true,
  });
