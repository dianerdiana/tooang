import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), upload: vi.fn(), complete: vi.fn() }));
vi.mock('../services/media.service', () => ({
  mediaService: { createUploadIntent: mocks.create, completeUploadIntent: mocks.complete },
}));
vi.mock('../integrations/imagekit-upload', () => ({ uploadToImageKit: mocks.upload }));

import { MEDIA_TARGET, type MediaUploadAuthorization } from '../types/media.type';

import { executeMediaUpload } from './media-upload.mutation';

const placeId = '550e8400-e29b-41d4-a716-446655440000';
const authorization = { intentId: 'intent-id' } as MediaUploadAuthorization;
const file = { name: 'image.png', type: 'image/png', size: 100 } as File;

describe('media upload workflow', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.upload.mockReset();
    mocks.complete.mockReset();
  });

  it('authorizes, uploads, and completes in order with progress and phases', async () => {
    const order: string[] = [];
    mocks.create.mockImplementation(async () => {
      order.push('authorize');
      return authorization;
    });
    mocks.upload.mockImplementation(async ({ onProgress }: { onProgress: (value: number) => void }) => {
      order.push('upload');
      onProgress(55);
      return { fileId: 'file-id' };
    });
    mocks.complete.mockImplementation(async () => {
      order.push('complete');
      return { imageUrl: 'https://ik/image' };
    });
    const phases = vi.fn();
    const progress = vi.fn();

    await expect(
      executeMediaUpload({
        file,
        target: { target: MEDIA_TARGET.PLACE_LOGO, placeId },
        onPhaseChange: phases,
        onProgress: progress,
      }),
    ).resolves.toEqual({ imageUrl: 'https://ik/image' });

    expect(order).toEqual(['authorize', 'upload', 'complete']);
    expect(phases.mock.calls.flat()).toEqual(['authorizing', 'uploading', 'completing', 'success']);
    expect(progress).toHaveBeenLastCalledWith(100);
  });

  it('does not complete after provider failure and obtains a new intent on retry', async () => {
    mocks.create.mockResolvedValue(authorization);
    mocks.upload.mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce({ fileId: 'file-id' });
    mocks.complete.mockResolvedValue({ imageUrl: 'https://ik/image' });
    const input = { file, target: { target: MEDIA_TARGET.PLACE_COVER, placeId } as const };

    await expect(executeMediaUpload(input)).rejects.toThrow('failed');
    expect(mocks.complete).not.toHaveBeenCalled();
    await expect(executeMediaUpload(input)).resolves.toEqual({ imageUrl: 'https://ik/image' });
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});
