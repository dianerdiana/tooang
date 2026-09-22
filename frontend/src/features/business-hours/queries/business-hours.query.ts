import { queryOptions } from '@tanstack/react-query';

import { businessHoursService } from '../services/business-hours.service';

export const businessHoursKeys = {
  all: ['business-hours'] as const,
  place: (placeId: string) => [...businessHoursKeys.all, placeId] as const,
};

export const businessHoursQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: businessHoursKeys.place(placeId),
    queryFn: () => businessHoursService.list(placeId),
    staleTime: 15_000,
  });
