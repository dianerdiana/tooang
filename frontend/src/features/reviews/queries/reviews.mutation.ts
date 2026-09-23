import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { reviewsService } from '../services/reviews.service';
import type { ReviewModerationTab } from '../types/reviews.type';

import { moderationReviewKeys } from './reviews.query';

export const invalidateModerationReviews = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: moderationReviewKeys.all });

export const useModerateReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tab, reviewId }: { tab: ReviewModerationTab; reviewId: string }) =>
      tab === 'place' ? reviewsService.moderatePlaceReview(reviewId) : reviewsService.moderateMenuItemReview(reviewId),
    onSuccess: () => invalidateModerationReviews(queryClient),
  });
};
