import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';

export const orderDetailKeys = {
  all: ['orders', 'detail'] as const,
  place: (placeId: string) => [...orderDetailKeys.all, 'place', placeId] as const,
  placeOrder: (placeId: string, orderId: string) => [...orderDetailKeys.place(placeId), orderId] as const,
};

export const placeOrderDetailQueryOptions = (placeId: string, orderId: string | null) =>
  queryOptions({
    queryKey: orderDetailKeys.placeOrder(placeId, orderId ?? 'disabled'),
    queryFn: () => {
      if (!orderId) throw new Error('An order identifier is required');
      return ordersService.getForPlace(placeId, orderId);
    },
    enabled: orderId !== null,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
