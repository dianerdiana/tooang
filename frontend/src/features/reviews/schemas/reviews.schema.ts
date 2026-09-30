import { z } from 'zod';

import {
  type CreateReviewInput,
  type NormalizedPublicPlaceReviewListParams,
  type PublicPlaceReviewListParams,
  REVIEW_MODERATION_TAB,
  type ReviewModerationListParams,
  type ReviewModerationSearch,
} from '../types/reviews.type';

export const DEFAULT_REVIEW_PAGE = 1;
export const DEFAULT_REVIEW_LIMIT = 20;
export const PUBLIC_PLACE_REVIEWS_PAGE_SIZE = 10;
export const REVIEW_COMMENT_MAX_LENGTH = 2000;

export const reviewUnicodeLength = (value: string) => Array.from(value).length;

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

const requiredUuid = z.string().trim().toLowerCase().uuid();

const publicReviewListSchema = z
  .object({
    page: positiveInteger(DEFAULT_REVIEW_PAGE),
    limit: positiveInteger(DEFAULT_REVIEW_LIMIT, 100),
  })
  .strip();

export const normalizePublicReviewPlaceId = (placeId: string) => requiredUuid.parse(placeId);

export const normalizePublicPlaceReviewListParams = (
  params: PublicPlaceReviewListParams,
): NormalizedPublicPlaceReviewListParams =>
  publicReviewListSchema.parse(params) as NormalizedPublicPlaceReviewListParams;

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

export const reviewRatingSchema = z.number().int('Choose a whole-star rating.').min(1).max(5);

export const reviewCommentSchema = z
  .union([z.string(), z.null()])
  .transform((value) => (value === null ? null : value.normalize('NFC').trim() || null))
  .refine(
    (value) => value === null || reviewUnicodeLength(value) <= REVIEW_COMMENT_MAX_LENGTH,
    `Use at most ${REVIEW_COMMENT_MAX_LENGTH.toLocaleString()} characters.`,
  );

export const reviewDraftSchema = z
  .object({
    rating: reviewRatingSchema,
    comment: reviewCommentSchema.optional(),
  })
  .strict();

export const createReviewSchema: z.ZodType<CreateReviewInput> = reviewDraftSchema
  .extend({ orderId: requiredUuid })
  .strict();

export const reviewUpdateSchema = z
  .object({
    rating: reviewRatingSchema.optional(),
    comment: reviewCommentSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Change the rating or comment before saving.');
