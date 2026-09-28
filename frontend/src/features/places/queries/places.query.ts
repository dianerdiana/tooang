import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import {
  normalizePlaceListParams,
  normalizePublicPlaceListParams,
  normalizePublicPlaceSlug,
} from '../schemas/places.schema';
import { placesService } from '../services/places.service';
import type { PlaceListParams, PublicPlaceListParams } from '../types/places.type';

import { placesKeys } from './places.key';

export const publicPlacesQueryOptions = (params: PublicPlaceListParams) => {
  const normalized = normalizePublicPlaceListParams(params);
  return queryOptions({
    queryKey: placesKeys.publicList(normalized),
    queryFn: () => placesService.listPublic(normalized),
    staleTime: 30_000,
  });
};

export const publicPlaceQueryOptions = (slug: string) => {
  const normalizedSlug = normalizePublicPlaceSlug(slug);
  return queryOptions({
    queryKey: placesKeys.publicDetail(normalizedSlug),
    queryFn: () => placesService.getPublic(normalizedSlug),
    staleTime: 30_000,
  });
};

export const managementPlacesQueryOptions = (params: PlaceListParams) => {
  const normalized = normalizePlaceListParams(params);
  return queryOptions({
    queryKey: placesKeys.managementList(normalized),
    queryFn: () => placesService.listManagement(normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

export const managementPlaceQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: placesKeys.managementDetail(placeId),
    queryFn: () => placesService.getManagement(placeId),
    staleTime: 15_000,
  });
