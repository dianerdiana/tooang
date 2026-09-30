import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import {
  createReviewSchema,
  normalizePublicPlaceReviewListParams,
  normalizePublicReviewPlaceId,
  normalizeReviewModerationParams,
} from '../schemas/reviews.schema';
import type {
  CreateReviewInput,
  MenuItemModerationReview,
  MenuItemReviewCreateResponse,
  ModeratedReview,
  OwnMenuItemReview,
  OwnPlaceReview,
  PlaceModerationReview,
  PlaceReviewCreateResponse,
  PublicMenuItemReviewListResult,
  PublicPlaceReview,
  PublicPlaceReviewListParams,
  PublicPlaceReviewListResult,
  PublicReviewPaginationMeta,
  PublicReviewSummary,
  ReviewCreateOutcome,
  ReviewModerationListParams,
  ReviewModerationListResult,
  ReviewUpdateInput,
} from '../types/reviews.type';

const createReview = async <TResponse extends { review: PublicPlaceReview }>(
  endpoint: string,
  input: CreateReviewInput,
): Promise<ReviewCreateOutcome<TResponse['review']>> => {
  try {
    const normalizedInput = createReviewSchema.parse(input);
    const response = await api.post<CreateReviewInput, ApiResponse<TResponse>>(endpoint, normalizedInput);
    return {
      review: unwrapApiResponse(response.data).review,
      outcome: response.status === 200 ? 'restored' : 'created',
    };
  } catch (error) {
    throw toApiError(error);
  }
};

const list = async <TReview>(endpoint: string, params: ReviewModerationListParams) => {
  try {
    const response = await api.get<ApiPaginatedResponse<{ reviews: TReview[] }>>(endpoint, {
      params: normalizeReviewModerationParams(params),
    });
    const result = unwrapPaginatedApiResponse(response.data);
    return { reviews: result.items.reviews, meta: result.meta };
  } catch (error) {
    throw toApiError(error);
  }
};

const moderate = async (endpoint: string): Promise<ModeratedReview> => {
  try {
    const response = await api.delete<ApiResponse<{ review: ModeratedReview }>>(endpoint);
    return unwrapApiResponse(response.data).review;
  } catch (error) {
    throw toApiError(error);
  }
};

export const reviewsService = {
  createPlaceReview(placeId: string, input: CreateReviewInput) {
    return createReview<PlaceReviewCreateResponse>(
      `/places/${encodeURIComponent(normalizePublicReviewPlaceId(placeId))}/reviews`,
      input,
    );
  },

  createMenuItemReview(placeId: string, menuItemId: string, input: CreateReviewInput) {
    return createReview<MenuItemReviewCreateResponse>(
      `/places/${encodeURIComponent(normalizePublicReviewPlaceId(placeId))}/menu-items/${encodeURIComponent(normalizePublicReviewPlaceId(menuItemId))}/reviews`,
      input,
    );
  },

  async listPublicMenuItemReviews(
    placeId: string,
    menuItemId: string,
    params: PublicPlaceReviewListParams,
  ): Promise<PublicMenuItemReviewListResult> {
    try {
      const normalizedPlaceId = normalizePublicReviewPlaceId(placeId);
      const normalizedMenuItemId = normalizePublicReviewPlaceId(menuItemId);
      const response = await api.get<ApiPaginatedResponse<Pick<PublicMenuItemReviewListResult, 'reviews' | 'summary'>>>(
        `/places/${encodeURIComponent(normalizedPlaceId)}/menu-items/${encodeURIComponent(normalizedMenuItemId)}/reviews`,
        { params: normalizePublicPlaceReviewListParams(params) },
      );
      const result = unwrapPaginatedApiResponse(response.data);
      return {
        reviews: result.items.reviews,
        summary: result.items.summary,
        meta: result.meta as PublicReviewPaginationMeta,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async listPublicPlaceReviews(
    placeId: string,
    params: PublicPlaceReviewListParams,
  ): Promise<PublicPlaceReviewListResult> {
    try {
      const normalizedPlaceId = normalizePublicReviewPlaceId(placeId);
      const normalizedParams = normalizePublicPlaceReviewListParams(params);
      const response = await api.get<
        ApiPaginatedResponse<{ reviews: PublicPlaceReview[]; summary: PublicReviewSummary }>
      >(`/places/${encodeURIComponent(normalizedPlaceId)}/reviews`, { params: normalizedParams });
      const result = unwrapPaginatedApiResponse(response.data);
      return {
        reviews: result.items.reviews,
        summary: result.items.summary,
        meta: result.meta as PublicReviewPaginationMeta,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  listOwnPlaceReviews(
    params: Pick<ReviewModerationListParams, 'page' | 'limit'>,
  ): Promise<ReviewModerationListResult<OwnPlaceReview>> {
    return list('/me/place-reviews', params);
  },

  listOwnMenuItemReviews(
    params: Pick<ReviewModerationListParams, 'page' | 'limit'>,
  ): Promise<ReviewModerationListResult<OwnMenuItemReview>> {
    return list('/me/menu-item-reviews', params);
  },

  async updateOwnReview(kind: 'place' | 'menu-item', reviewId: string, input: ReviewUpdateInput) {
    try {
      const response = await api.patch<ReviewUpdateInput, ApiResponse<{ review: unknown }>>(
        `/me/${kind}-reviews/${encodeURIComponent(reviewId)}`,
        input,
      );
      return unwrapApiResponse(response.data).review;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async deleteOwnReview(kind: 'place' | 'menu-item', reviewId: string) {
    try {
      const response = await api.delete<ApiResponse<{ review: unknown }>>(
        `/me/${kind}-reviews/${encodeURIComponent(reviewId)}`,
      );
      return unwrapApiResponse(response.data).review;
    } catch (error) {
      throw toApiError(error);
    }
  },
  listPlaceReviews(params: ReviewModerationListParams): Promise<ReviewModerationListResult<PlaceModerationReview>> {
    return list('/place-reviews', params);
  },

  listMenuItemReviews(
    params: ReviewModerationListParams,
  ): Promise<ReviewModerationListResult<MenuItemModerationReview>> {
    return list('/menu-item-reviews', params);
  },

  moderatePlaceReview(reviewId: string) {
    return moderate(`/place-reviews/${encodeURIComponent(reviewId)}`);
  },

  moderateMenuItemReview(reviewId: string) {
    return moderate(`/menu-item-reviews/${encodeURIComponent(reviewId)}`);
  },
};
