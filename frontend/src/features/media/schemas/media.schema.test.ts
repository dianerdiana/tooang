import { describe, expect, it } from 'vitest';

import { MAX_MEDIA_SIZE_BYTES, MEDIA_MIME_TYPE, MEDIA_TARGET } from '../types/media.type';

import { createUploadIntentSchema, toCreateUploadIntent, validateMediaFile } from './media.schema';

const file = (type: string, size: number) => ({ name: 'image.bin', type, size }) as File;
const placeId = '550e8400-e29b-41d4-a716-446655440000';
const menuItemId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

describe('media schemas', () => {
  it.each(Object.values(MEDIA_MIME_TYPE))('accepts backend-supported MIME type %s', (type) => {
    expect(validateMediaFile(file(type, MAX_MEDIA_SIZE_BYTES)).type).toBe(type);
  });

  it('rejects empty, oversized, and unsupported files from client UX', () => {
    expect(() => validateMediaFile(file('image/png', 0))).toThrow('non-empty');
    expect(() => validateMediaFile(file('image/png', MAX_MEDIA_SIZE_BYTES + 1))).toThrow('5 MB');
    expect(() => validateMediaFile(file('image/gif', 100))).toThrow('JPEG, PNG, WebP, or AVIF');
  });

  it('creates strict target-aware intent payloads', () => {
    expect(toCreateUploadIntent(file('image/webp', 42), { target: MEDIA_TARGET.PLACE_LOGO, placeId })).toEqual({
      target: 'PLACE_LOGO',
      placeId,
      mimeType: 'image/webp',
      sizeBytes: 42,
    });
    expect(
      toCreateUploadIntent(file('image/avif', 42), { target: MEDIA_TARGET.MENU_ITEM_IMAGE, placeId, menuItemId }),
    ).toMatchObject({ target: 'MENU_ITEM_IMAGE', menuItemId });
    expect(() =>
      createUploadIntentSchema.parse({
        target: 'MENU_ITEM_IMAGE',
        placeId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }),
    ).toThrow();
    expect(() =>
      createUploadIntentSchema.parse({
        target: 'PLACE_COVER',
        placeId,
        menuItemId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }),
    ).toThrow();
  });
});
