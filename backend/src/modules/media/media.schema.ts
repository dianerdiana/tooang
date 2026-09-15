import { z } from 'zod';

import { MediaTargetType } from '@/generated/prisma/client';

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export const MAX_MEDIA_SIZE_BYTES = 5_242_880;

const baseIntent = z.object({
  target: z.enum(MediaTargetType),
  placeId: z.string().uuid(),
  mimeType: z.enum(ALLOWED_MEDIA_MIME_TYPES),
  sizeBytes: z.number().int().min(1).max(MAX_MEDIA_SIZE_BYTES),
});

export const createUploadIntentSchema = z.discriminatedUnion('target', [
  baseIntent
    .extend({ target: z.literal(MediaTargetType.PLACE_LOGO), menuItemId: z.never().optional() })
    .strict(),
  baseIntent
    .extend({ target: z.literal(MediaTargetType.PLACE_COVER), menuItemId: z.never().optional() })
    .strict(),
  baseIntent
    .extend({ target: z.literal(MediaTargetType.MENU_ITEM_IMAGE), menuItemId: z.string().uuid() })
    .strict(),
]);

export const completeUploadIntentSchema = z
  .object({ fileId: z.string().trim().min(1).max(255) })
  .strict();
export const intentParamSchema = z.object({ intentId: z.string().uuid() }).strict();
export const placeMediaParamSchema = z.object({ placeId: z.string().uuid() }).strict();
export const menuItemMediaParamSchema = z
  .object({ placeId: z.string().uuid(), menuItemId: z.string().uuid() })
  .strict();

export type CreateUploadIntentInput = z.infer<typeof createUploadIntentSchema>;
export type CompleteUploadIntentInput = z.infer<typeof completeUploadIntentSchema>;
export type IntentParam = z.infer<typeof intentParamSchema>;
export type PlaceMediaParam = z.infer<typeof placeMediaParamSchema>;
export type MenuItemMediaParam = z.infer<typeof menuItemMediaParamSchema>;
