import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { orderDetailKeys } from '@/features/orders/queries/order-detail.query';

import { reviewsService } from '../services/reviews.service';
import type {
  CreateReviewInput,
  OwnReviewMutationContext,
  ReviewModerationTab,
  ReviewUpdateInput,
} from '../types/reviews.type';

import { moderationReviewKeys } from './reviews.query';
import { ownReviewKeys } from './reviews.query';
import { publicMenuItemReviewKeys, publicPlaceReviewKeys } from './reviews.query';

export const invalidatePublicPlaceReviews = (queryClient: QueryClient, placeId: string) =>
  queryClient.invalidateQueries({ queryKey: publicPlaceReviewKeys.place(placeId) });

export const invalidatePublicMenuItemReviews = (queryClient: QueryClient, placeId: string, menuItemId: string) =>
  queryClient.invalidateQueries({ queryKey: publicMenuItemReviewKeys.item(placeId, menuItemId) });

export const invalidateCreatedPlaceReview = (queryClient: QueryClient, placeId: string, orderId: string) =>
  Promise.all([
    invalidatePublicPlaceReviews(queryClient, placeId),
    queryClient.invalidateQueries({ queryKey: ownReviewKeys.lists('place') }),
    queryClient.invalidateQueries({ queryKey: orderDetailKeys.ownOrder(orderId) }),
  ]);

export const invalidateCreatedMenuItemReview = (
  queryClient: QueryClient,
  placeId: string,
  menuItemId: string,
  orderId: string,
) =>
  Promise.all([
    invalidatePublicMenuItemReviews(queryClient, placeId, menuItemId),
    queryClient.invalidateQueries({ queryKey: ownReviewKeys.lists('menu-item') }),
    queryClient.invalidateQueries({ queryKey: orderDetailKeys.ownOrder(orderId) }),
  ]);

export const invalidateOwnReviewContext = async (queryClient: QueryClient, context: OwnReviewMutationContext) => {
  const invalidations: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: ownReviewKeys.lists(context.tab) }),
  ];
  if (context.tab === 'place') {
    invalidations.push(invalidatePublicPlaceReviews(queryClient, context.placeId));
  } else if (context.menuItemId) {
    invalidations.push(invalidatePublicMenuItemReviews(queryClient, context.placeId, context.menuItemId));
  }
  await Promise.all(invalidations);
};

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

export const useCreatePlaceReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, input }: { placeId: string; input: CreateReviewInput }) =>
      reviewsService.createPlaceReview(placeId, input),
    onSuccess: (_result, variables) =>
      invalidateCreatedPlaceReview(queryClient, variables.placeId, variables.input.orderId),
  });
};

export const useCreateMenuItemReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeId, menuItemId, input }: { placeId: string; menuItemId: string; input: CreateReviewInput }) =>
      reviewsService.createMenuItemReview(placeId, menuItemId, input),
    onSuccess: (_result, variables) =>
      invalidateCreatedMenuItemReview(queryClient, variables.placeId, variables.menuItemId, variables.input.orderId),
  });
};

export const useUpdateOwnReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tab, reviewId, input }: OwnReviewMutationContext & { input: ReviewUpdateInput }) =>
      reviewsService.updateOwnReview(tab, reviewId, input),
    onSuccess: (_result, variables) => invalidateOwnReviewContext(queryClient, variables),
  });
};

export const useDeleteOwnReviewMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tab, reviewId }: OwnReviewMutationContext) => reviewsService.deleteOwnReview(tab, reviewId),
    onSuccess: (_result, variables) => invalidateOwnReviewContext(queryClient, variables),
  });
};
