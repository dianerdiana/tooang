import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse } from '@/types/api-response.type';

import { normalizePlaceListParams } from '../schemas/places.schema';
import type { PlaceListParams, PlaceListResult, PlaceSummary } from '../types/places.type';

type PlaceListData = { places: PlaceSummary[] };

export const placesService = {
  async listManagement(params: PlaceListParams): Promise<PlaceListResult> {
    try {
      const response = await api.get<ApiPaginatedResponse<PlaceListData>>('/places/management', {
        params: normalizePlaceListParams(params),
      });
      const result = unwrapPaginatedApiResponse(response.data);
      return { places: result.items.places, meta: result.meta };
    } catch (error) {
      throw toApiError(error);
    }
  },
};
