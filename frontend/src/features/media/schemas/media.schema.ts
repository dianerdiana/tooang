import { z } from 'zod';

import {
  type CreateUploadIntentInput,
  MAX_MEDIA_SIZE_BYTES,
  MEDIA_MIME_TYPE,
  MEDIA_TARGET,
  type MediaMimeType,
  type MediaTargetIdentity,
} from '../types/media.type';

const uuid = z.string().uuid();
const baseIntent = z.object({
  placeId: uuid,
  mimeType: z.enum(MEDIA_MIME_TYPE),
  sizeBytes: z.number().int().min(1).max(MAX_MEDIA_SIZE_BYTES),
});

export const createUploadIntentSchema = z.discriminatedUnion('target', [
  baseIntent.extend({ target: z.literal(MEDIA_TARGET.PLACE_LOGO), menuItemId: z.never().optional() }).strict(),
  baseIntent.extend({ target: z.literal(MEDIA_TARGET.PLACE_COVER), menuItemId: z.never().optional() }).strict(),
  baseIntent.extend({ target: z.literal(MEDIA_TARGET.MENU_ITEM_IMAGE), menuItemId: uuid }).strict(),
]);

export const completeUploadIntentSchema = z.object({ fileId: z.string().trim().min(1).max(255) }).strict();

export const validateMediaFile = (file: Pick<File, 'name' | 'size' | 'type'>) => {
  if (file.size < 1) throw new Error('Choose a non-empty image file.');
  if (file.size > MAX_MEDIA_SIZE_BYTES) throw new Error('Image size must not exceed 5 MB.');
  if (!Object.values(MEDIA_MIME_TYPE).includes(file.type as MediaMimeType)) {
    throw new Error('Choose a JPEG, PNG, WebP, or AVIF image.');
  }
  return file as Pick<File, 'name' | 'size' | 'type'> & { type: MediaMimeType };
};

export const toCreateUploadIntent = (file: File, target: MediaTargetIdentity): CreateUploadIntentInput => {
  const validFile = validateMediaFile(file);
  return createUploadIntentSchema.parse({
    ...target,
    mimeType: validFile.type,
    sizeBytes: validFile.size,
  }) as CreateUploadIntentInput;
};
