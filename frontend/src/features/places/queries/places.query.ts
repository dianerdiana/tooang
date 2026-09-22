import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { normalizePlaceListParams } from '../schemas/places.schema';
import { placesService } from '../services/places.service';
import type { PlaceListParams } from '../types/places.type';

import { placesKeys } from './places.key';

export const managementPlacesQueryOptions = (params: PlaceListParams) => {
  const normalized = normalizePlaceListParams(params);
  return queryOptions({
    queryKey: placesKeys.managementList(normalized),
    queryFn: () => placesService.listManagement(normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};
