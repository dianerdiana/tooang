import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizeReviewModerationParams } from '../schemas/reviews.schema';
import type {
  MenuItemModerationReview,
  ModeratedReview,
  OwnMenuItemReview,
  OwnPlaceReview,
  PlaceModerationReview,
  ReviewModerationListParams,
  ReviewModerationListResult,
  ReviewUpdateInput,
} from '../types/reviews.type';

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
