import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';

export const orderVerificationAccessKeys = {
  all: ['orders', 'detail', 'own', 'verification'] as const,
  order: (orderId: string) => [...orderVerificationAccessKeys.all, orderId] as const,
};

export const orderVerificationAccessQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: orderVerificationAccessKeys.order(orderId),
    queryFn: () => ordersService.getOwnVerification(orderId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
