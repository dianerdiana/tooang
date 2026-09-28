import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import {
  normalizePlaceListParams,
  normalizePublicPlaceListParams,
  normalizePublicPlaceSlug,
} from '../schemas/places.schema';
import type {
  PlaceCreateInput,
  PlaceListParams,
  PlaceListResult,
  PlaceOrderingInput,
  PlacePublishingInput,
  PlaceSummary,
  PlaceUpdateInput,
  PublicPlaceDetail,
  PublicPlaceListItem,
  PublicPlaceListParams,
  PublicPlaceListResult,
  PublicPlacePaginationMeta,
} from '../types/places.type';

type PlaceListData = { places: PlaceSummary[] };
type PublicPlaceListData = { places: PublicPlaceListItem[] };

export const placesService = {
  async listPublic(params: PublicPlaceListParams): Promise<PublicPlaceListResult> {
    try {
      const response = await api.get<ApiPaginatedResponse<PublicPlaceListData>>('/places', {
        params: normalizePublicPlaceListParams(params),
      });
      const result = unwrapPaginatedApiResponse(response.data);
      return { places: result.items.places, meta: result.meta as PublicPlacePaginationMeta };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getPublic(slug: string): Promise<PublicPlaceDetail> {
    try {
      const normalizedSlug = normalizePublicPlaceSlug(slug);
      const response = await api.get<ApiResponse<{ place: PublicPlaceDetail }>>(`/places/${normalizedSlug}`);
      return unwrapApiResponse(response.data).place;
    } catch (error) {
      throw toApiError(error);
    }
  },

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
