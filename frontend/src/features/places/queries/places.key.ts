import { normalizePlaceListParams } from '../schemas/places.schema';
import type { PlaceListParams } from '../types/places.type';

export const placesKeys = {
  all: ['places'] as const,
  management: () => [...placesKeys.all, 'management'] as const,
  managementList: (params: PlaceListParams) => [...placesKeys.management(), normalizePlaceListParams(params)] as const,
};
