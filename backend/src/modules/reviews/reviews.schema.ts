import { z } from 'zod';

import { paginationFields } from '@/common/schemas';

const unicodeLength = (value: string) => Array.from(value).length;
const normalizeUuid = (value: string) => value.toLowerCase();
const uuid = z.string().uuid().transform(normalizeUuid);

export const reviewRatingSchema = z.number().int().min(1).max(5);

export const reviewCommentSchema = z
  .union([z.string(), z.null()])
  .transform((value) => (value === null ? null : value.normalize('NFC').trim() || null))
  .refine(
    (value) => value === null || unicodeLength(value) <= 2000,
    'Comment must contain at most 2000 characters',
  );

export const createReviewSchema = z
  .object({
    orderId: uuid,
    rating: reviewRatingSchema,
    comment: reviewCommentSchema.optional(),
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: reviewRatingSchema.optional(),
    comment: reviewCommentSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one supported field is required');

export const reviewListSchema = z
  .object({
    ...paginationFields,
  })
  .strict();

export const placeReviewModerationListSchema = z
  .object({
    ...paginationFields,
    placeId: uuid.optional(),
  })
  .strict();

export const menuItemReviewModerationListSchema = z
  .object({
    ...paginationFields,
    placeId: uuid.optional(),
    menuItemId: uuid.optional(),
  })
  .strict();

export const placeReviewParamSchema = z.object({ placeId: uuid }).strict();

export const menuItemReviewParamSchema = z.object({ placeId: uuid, menuItemId: uuid }).strict();

export const reviewIdParamSchema = z.object({ reviewId: uuid }).strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewListInput = z.infer<typeof reviewListSchema>;
export type PlaceReviewModerationListInput = z.infer<typeof placeReviewModerationListSchema>;
export type MenuItemReviewModerationListInput = z.infer<typeof menuItemReviewModerationListSchema>;
export type PlaceReviewParam = z.infer<typeof placeReviewParamSchema>;
export type MenuItemReviewParam = z.infer<typeof menuItemReviewParamSchema>;
export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;
