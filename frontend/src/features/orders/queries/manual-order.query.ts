import { queryOptions } from '@tanstack/react-query';

import { ordersService } from '../services/orders.service';

export const manualOrderOptionsKey = (placeId: string) => ['orders', 'manual-options', placeId] as const;

export const manualOrderOptionsQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: manualOrderOptionsKey(placeId),
    queryFn: () => ordersService.getManualOrderOptions(placeId),
    staleTime: 15_000,
  });
