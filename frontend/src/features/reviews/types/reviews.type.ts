import type { ApiPaginationMeta } from '@/types/api-response.type';

export const REVIEW_MODERATION_TAB = {
  PLACE: 'place',
  MENU_ITEM: 'menu-item',
} as const;

export type ReviewModerationTab = (typeof REVIEW_MODERATION_TAB)[keyof typeof REVIEW_MODERATION_TAB];

type ModerationReviewBase = {
  reviewId: string;
  rating: number;
  comment: string | null;
  reviewer: { userId: string; fullName: string };
  place: { placeId: string; name: string };
  createdAt: string;
  updatedAt: string;
};

export type PlaceModerationReview = ModerationReviewBase;

export type MenuItemModerationReview = ModerationReviewBase & {
  menuItem: { menuItemId: string; name: string };
};

export type ReviewModerationSearch = {
  tab: ReviewModerationTab;
  page: number;
  limit: number;
  placeId?: string;
  menuItemId?: string;
};

export type ReviewModerationListParams = Pick<ReviewModerationSearch, 'page' | 'limit' | 'placeId' | 'menuItemId'>;

export type ReviewModerationListResult<TReview> = {
  reviews: TReview[];
  meta: ApiPaginationMeta;
};

export type ModeratedReview = { reviewId: string; deletedAt: string };

export type OwnReviewTab = ReviewModerationTab;
export type OwnReviewBase = {
  reviewId: string;
  rating: number;
  comment: string | null;
  place: { placeId: string; name: string };
  order: { orderId: string; orderCode: string };
  createdAt: string;
  updatedAt: string;
};
export type OwnPlaceReview = OwnReviewBase;
export type OwnMenuItemReview = OwnReviewBase & { menuItem: { menuItemId: string; name: string } };
export type OwnReviewSearch = { tab: OwnReviewTab; page: number; limit: number };
export type ReviewUpdateInput = { rating?: number; comment?: string | null };
