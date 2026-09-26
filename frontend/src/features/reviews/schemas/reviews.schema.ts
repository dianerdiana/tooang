import { z } from 'zod';

import {
  REVIEW_MODERATION_TAB,
  type ReviewModerationListParams,
  type ReviewModerationSearch,
} from '../types/reviews.type';

export const DEFAULT_REVIEW_PAGE = 1;
export const DEFAULT_REVIEW_LIMIT = 20;

const positiveInteger = (fallback: number, maximum?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
      return fallback;
    },
    maximum ? z.number().int().min(1).max(maximum).catch(fallback) : z.number().int().min(1).catch(fallback),
  );

const optionalUuid = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined),
  z.string().uuid().optional().catch(undefined),
);

export const reviewModerationSearchSchema = z
  .object({
    tab: z.enum(REVIEW_MODERATION_TAB).default(REVIEW_MODERATION_TAB.PLACE).catch(REVIEW_MODERATION_TAB.PLACE),
    page: positiveInteger(DEFAULT_REVIEW_PAGE),
    limit: positiveInteger(DEFAULT_REVIEW_LIMIT, 100),
    placeId: optionalUuid,
    menuItemId: optionalUuid,
  })
  .strip();

export const parseReviewModerationSearch = (search: Record<string, unknown>): ReviewModerationSearch => {
  const parsed = reviewModerationSearchSchema.parse(search) as ReviewModerationSearch;
  return {
    tab: parsed.tab,
    page: parsed.page,
    limit: parsed.limit,
    ...(parsed.placeId ? { placeId: parsed.placeId } : {}),
    ...(parsed.tab === REVIEW_MODERATION_TAB.MENU_ITEM && parsed.menuItemId ? { menuItemId: parsed.menuItemId } : {}),
  };
};

export const normalizeReviewModerationParams = (
  params: Partial<ReviewModerationListParams>,
): ReviewModerationListParams => {
  const parsed = reviewModerationSearchSchema.parse(params) as ReviewModerationSearch;
  return {
    page: parsed.page,
    limit: parsed.limit,
    ...(parsed.placeId ? { placeId: parsed.placeId } : {}),
    ...(parsed.menuItemId ? { menuItemId: parsed.menuItemId } : {}),
  };
};

export const parseOwnReviewSearch = (search: Record<string, unknown>) => {
  const parsed = reviewModerationSearchSchema.parse(search) as ReviewModerationSearch;
  return { tab: parsed.tab, page: parsed.page, limit: parsed.limit };
};

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => value || null),
});
