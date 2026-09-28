import {
  normalizePlaceListParams,
  normalizePublicPlaceListParams,
  normalizePublicPlaceSlug,
} from '../schemas/places.schema';
import type { PlaceListParams, PublicPlaceListParams } from '../types/places.type';

export const placesKeys = {
  all: ['places'] as const,
  public: () => [...placesKeys.all, 'public'] as const,
  publicList: (params: PublicPlaceListParams) =>
    [...placesKeys.public(), 'list', normalizePublicPlaceListParams(params)] as const,
  publicDetail: (slug: string) => [...placesKeys.public(), 'detail', normalizePublicPlaceSlug(slug)] as const,
  management: () => [...placesKeys.all, 'management'] as const,
  managementList: (params: PlaceListParams) => [...placesKeys.management(), normalizePlaceListParams(params)] as const,
  managementDetail: (placeId: string) => [...placesKeys.management(), 'detail', placeId] as const,
};
