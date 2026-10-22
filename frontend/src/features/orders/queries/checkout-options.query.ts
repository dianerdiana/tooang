import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';

export const checkoutOptionsKeys = {
  all: ['orders', 'checkout-options'] as const,
  place: (placeId: string) => [...checkoutOptionsKeys.all, placeId] as const,
};

export const checkoutOptionsQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: checkoutOptionsKeys.place(placeId),
    queryFn: () => ordersService.getCheckoutOptions(placeId),
    staleTime: 30_000,
  });
