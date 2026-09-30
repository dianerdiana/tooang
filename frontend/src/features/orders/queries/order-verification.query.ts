import { queryOptions } from '@tanstack/react-query';

import { isVerificationToken } from '@/utils/navigation/customer-route-params';

import { ordersService } from '../services/orders.service';

export const publicOrderVerificationKeys = {
  all: ['orders', 'public-verification'] as const,
  detail: (token: string) => [...publicOrderVerificationKeys.all, token] as const,
};

export const publicOrderVerificationQueryOptions = (token: string) =>
  queryOptions({
    queryKey: publicOrderVerificationKeys.detail(token),
    queryFn: () => ordersService.getPublicVerification(token),
    enabled: isVerificationToken(token),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
