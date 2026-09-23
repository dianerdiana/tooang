import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { normalizeReviewModerationParams } from '../schemas/reviews.schema';
import { reviewsService } from '../services/reviews.service';
import { REVIEW_MODERATION_TAB, type ReviewModerationListParams } from '../types/reviews.type';

export const moderationReviewKeys = {
  all: ['reviews', 'moderation'] as const,
  lists: () => [...moderationReviewKeys.all, 'list'] as const,
  list: (tab: string, params: ReviewModerationListParams) =>
    [...moderationReviewKeys.lists(), tab, normalizeReviewModerationParams(params)] as const,
};

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
