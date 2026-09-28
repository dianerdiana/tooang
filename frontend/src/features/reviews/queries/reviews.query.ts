import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';

import {
  normalizePublicPlaceReviewListParams,
  normalizePublicReviewPlaceId,
  normalizeReviewModerationParams,
} from '../schemas/reviews.schema';
import { reviewsService } from '../services/reviews.service';
import {
  type PublicPlaceReviewListParams,
  REVIEW_MODERATION_TAB,
  type ReviewModerationListParams,
} from '../types/reviews.type';

export const publicPlaceReviewKeys = {
  all: ['reviews', 'public'] as const,
  places: () => [...publicPlaceReviewKeys.all, 'place'] as const,
  place: (placeId: string) => [...publicPlaceReviewKeys.places(), normalizePublicReviewPlaceId(placeId)] as const,
  list: (placeId: string, params: PublicPlaceReviewListParams) =>
    [...publicPlaceReviewKeys.place(placeId), 'list', normalizePublicPlaceReviewListParams(params)] as const,
  infinite: (placeId: string, limit: number) =>
    [...publicPlaceReviewKeys.place(placeId), 'infinite', { limit }] as const,
};

export const publicPlaceReviewsQueryOptions = (placeId: string, params: PublicPlaceReviewListParams) => {
  const normalizedPlaceId = normalizePublicReviewPlaceId(placeId);
  const normalized = normalizePublicPlaceReviewListParams(params);
  return queryOptions({
    queryKey: publicPlaceReviewKeys.list(normalizedPlaceId, normalized),
    queryFn: () => reviewsService.listPublicPlaceReviews(normalizedPlaceId, normalized),
    staleTime: 30_000,
  });
};

export const publicPlaceReviewsInfiniteQueryOptions = (placeId: string, limit: number) => {
  const normalizedPlaceId = normalizePublicReviewPlaceId(placeId);
  const normalized = normalizePublicPlaceReviewListParams({ page: 1, limit });
  return infiniteQueryOptions({
    queryKey: publicPlaceReviewKeys.infinite(normalizedPlaceId, normalized.limit),
    queryFn: ({ pageParam }) =>
      reviewsService.listPublicPlaceReviews(normalizedPlaceId, { page: pageParam, limit: normalized.limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: 30_000,
  });
};

export const moderationReviewKeys = {
  all: ['reviews', 'moderation'] as const,
  lists: () => [...moderationReviewKeys.all, 'list'] as const,
  list: (tab: string, params: ReviewModerationListParams) =>
    [...moderationReviewKeys.lists(), tab, normalizeReviewModerationParams(params)] as const,
};

export const ownReviewKeys = {
  all: ['reviews', 'own'] as const,
  list: (tab: string, params: { page: number; limit: number }) => [...ownReviewKeys.all, tab, params] as const,
};

export const ownReviewsQueryOptions = (tab: 'place' | 'menu-item', params: { page: number; limit: number }) =>
  queryOptions({
    queryKey: ownReviewKeys.list(tab, params),
    queryFn: () =>
      tab === 'place' ? reviewsService.listOwnPlaceReviews(params) : reviewsService.listOwnMenuItemReviews(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export const placeModerationReviewsQueryOptions = (params: ReviewModerationListParams) => {
  const normalized = normalizeReviewModerationParams(params);
  return queryOptions({
    queryKey: moderationReviewKeys.list(REVIEW_MODERATION_TAB.PLACE, normalized),
    queryFn: () => reviewsService.listPlaceReviews(normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

export const menuItemModerationReviewsQueryOptions = (params: ReviewModerationListParams) => {
  const normalized = normalizeReviewModerationParams(params);
  return queryOptions({
    queryKey: moderationReviewKeys.list(REVIEW_MODERATION_TAB.MENU_ITEM, normalized),
    queryFn: () => reviewsService.listMenuItemReviews(normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};
