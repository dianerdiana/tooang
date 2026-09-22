import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizePlaceListParams } from '../schemas/places.schema';
import type {
  PlaceCreateInput,
  PlaceListParams,
  PlaceListResult,
  PlaceOrderingInput,
  PlacePublishingInput,
  PlaceSummary,
  PlaceUpdateInput,
} from '../types/places.type';

type PlaceListData = { places: PlaceSummary[] };

export const placesService = {
  async create(input: PlaceCreateInput): Promise<PlaceSummary> {
    try {
      const response = await api.post<PlaceCreateInput, ApiResponse<{ place: PlaceSummary }>>('/places', input);
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },

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

  async getManagement(placeId: string): Promise<PlaceSummary> {
    try {
      const response = await api.get<ApiResponse<{ place: PlaceSummary }>>(`/places/${placeId}/management`);
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, input: PlaceUpdateInput): Promise<PlaceSummary> {
    try {
      const response = await api.patch<PlaceUpdateInput, ApiResponse<{ place: PlaceSummary }>>(
        `/places/${placeId}`,
        input,
      );
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async setPublishing(placeId: string, input: PlacePublishingInput): Promise<PlaceSummary> {
    try {
      const response = await api.patch<PlacePublishingInput, ApiResponse<{ place: PlaceSummary }>>(
        `/places/${placeId}/publishing`,
        input,
      );
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async setOrdering(placeId: string, input: PlaceOrderingInput): Promise<PlaceSummary> {
    try {
      const response = await api.patch<PlaceOrderingInput, ApiResponse<{ place: PlaceSummary }>>(
        `/places/${placeId}/ordering`,
        input,
      );
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
