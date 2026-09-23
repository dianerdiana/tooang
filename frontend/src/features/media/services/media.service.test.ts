import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), post: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { MEDIA_TARGET, type MediaUploadAuthorization } from '../types/media.type';

import { mediaService } from './media.service';

const placeId = '550e8400-e29b-41d4-a716-446655440000';
const authorization: MediaUploadAuthorization = {
  intentId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  token: 'token',
  signature: 'signature',
  expire: 1_900_000_000,
  publicKey: 'public_key',
  uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
  fileName: 'generated.webp',
  folder: '/tooang/places/place/logo',
  useUniqueFileName: false,
  checks: 'checks',
};

describe('mediaService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('creates and completes upload intents with exact documented payloads', async () => {
    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Authorized', data: { upload: authorization } },
    });
    const input = {
      target: MEDIA_TARGET.PLACE_LOGO,
      placeId,
      mimeType: 'image/webp' as const,
      sizeBytes: 100,
    };
    await expect(mediaService.createUploadIntent(input)).resolves.toEqual(authorization);
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/media/upload-intents', input);

    apiMock.post.mockResolvedValueOnce({
      data: { error: false, message: 'Completed', data: { media: { imageUrl: 'https://ik.example/image' } } },
    });
    await expect(mediaService.completeUploadIntent('intent/id', { fileId: ' file-id ' })).resolves.toEqual({
      imageUrl: 'https://ik.example/image',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(2, '/media/upload-intents/intent%2Fid/complete', {
      fileId: 'file-id',
    });
  });

  it('normalizes backend failures', async () => {
    apiMock.post.mockRejectedValueOnce({ error: true, code: 'SERVICE_UNAVAILABLE', message: 'Media unavailable' });
    await expect(
      mediaService.createUploadIntent({
        target: MEDIA_TARGET.PLACE_COVER,
        placeId,
        mimeType: 'image/png',
        sizeBytes: 1,
      }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', message: 'Media unavailable', isNetworkError: false });
  });

  it('detaches logo, cover, and menu-item images through exact bodyless endpoints', async () => {
    apiMock.delete.mockResolvedValue({
      data: { error: false, message: 'Removed', data: { media: { imageUrl: null } } },
    });

    await expect(mediaService.detachPlaceLogo('place/id')).resolves.toEqual({ imageUrl: null });
    await expect(mediaService.detachPlaceCover('place/id')).resolves.toEqual({ imageUrl: null });
    await expect(mediaService.detachMenuItemImage('place/id', 'item/id')).resolves.toEqual({ imageUrl: null });

    expect(apiMock.delete).toHaveBeenNthCalledWith(1, '/places/place%2Fid/media/logo');
    expect(apiMock.delete).toHaveBeenNthCalledWith(2, '/places/place%2Fid/media/cover');
    expect(apiMock.delete).toHaveBeenNthCalledWith(3, '/places/place%2Fid/menu-items/item%2Fid/image');
  });
});
