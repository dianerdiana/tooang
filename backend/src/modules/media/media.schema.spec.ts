import { createUploadIntentSchema, MAX_MEDIA_SIZE_BYTES } from './media.schema';

const placeId = '11111111-1111-4111-8111-111111111111';
const menuItemId = '22222222-2222-4222-8222-222222222222';

describe('media schemas', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])(
    'allows %s within five MB',
    (mimeType) => {
      expect(
        createUploadIntentSchema.safeParse({
          target: 'PLACE_LOGO',
          placeId,
          mimeType,
          sizeBytes: MAX_MEDIA_SIZE_BYTES,
        }).success,
      ).toBe(true);
    },
  );

  it.each(['image/svg+xml', 'image/gif', 'video/mp4', 'application/pdf'])(
    'rejects %s',
    (mimeType) => {
      expect(
        createUploadIntentSchema.safeParse({
          target: 'PLACE_COVER',
          placeId,
          mimeType,
          sizeBytes: 1,
        }).success,
      ).toBe(false);
    },
  );

  it('requires a menu item only for menu-item image intents', () => {
    expect(
      createUploadIntentSchema.safeParse({
        target: 'MENU_ITEM_IMAGE',
        placeId,
        menuItemId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }).success,
    ).toBe(true);
    expect(
      createUploadIntentSchema.safeParse({
        target: 'MENU_ITEM_IMAGE',
        placeId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }).success,
    ).toBe(false);
    expect(
      createUploadIntentSchema.safeParse({
        target: 'PLACE_LOGO',
        placeId,
        menuItemId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }).success,
    ).toBe(false);
  });

  it('rejects zero, oversize, fractional, and unknown fields', () => {
    const base = { target: 'PLACE_LOGO', placeId, mimeType: 'image/png' };
    expect(createUploadIntentSchema.safeParse({ ...base, sizeBytes: 0 }).success).toBe(false);
    expect(
      createUploadIntentSchema.safeParse({ ...base, sizeBytes: MAX_MEDIA_SIZE_BYTES + 1 }).success,
    ).toBe(false);
    expect(createUploadIntentSchema.safeParse({ ...base, sizeBytes: 1.5 }).success).toBe(false);
    expect(
      createUploadIntentSchema.safeParse({ ...base, sizeBytes: 1, url: 'forged' }).success,
    ).toBe(false);
  });
});
