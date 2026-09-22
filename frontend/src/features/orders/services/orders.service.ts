import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse } from '@/types/api-response.type';

import type { OrderListParams, OrderListResult, OrderListScope, OrderSummary } from '../types/order.type';

type OrderListData = {
  orders: OrderSummary[];
};

const listOrders = async (endpoint: string, params: OrderListParams): Promise<OrderListResult> => {
  try {
    const response = await api.get<ApiPaginatedResponse<OrderListData>>(endpoint, { params });
    const result = unwrapPaginatedApiResponse(response.data);

    return {
      orders: result.items.orders,
      meta: result.meta,
    };
  } catch (error) {
    throw toApiError(error);
  }
};

export const ordersService = {
  listForPlace(placeId: string, params: OrderListParams) {
    return listOrders(`/places/${placeId}/orders`, params);
  },

  listGlobal(params: OrderListParams) {
    return listOrders('/orders', params);
  },

  list(scope: OrderListScope, params: OrderListParams) {
    return listOrders(scope.kind === 'place' ? `/places/${scope.placeId}/orders` : '/orders', params);
  },
};
