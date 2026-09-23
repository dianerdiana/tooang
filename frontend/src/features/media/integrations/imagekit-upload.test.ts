import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = vi.hoisted(() => ({ post: vi.fn(), isCancel: vi.fn(() => false) }));
vi.mock('axios', () => ({ default: axiosMock }));

import type { MediaUploadAuthorization } from '../types/media.type';

import { uploadToImageKit } from './imagekit-upload';

const authorization: MediaUploadAuthorization = {
  intentId: 'intent-id',
  token: 'one-time-token',
  signature: 'backend-signature',
  expire: 1_900_000_000,
  publicKey: 'public_key',
  uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
  fileName: 'generated.png',
  folder: '/tooang/places/place/logo',
  useUniqueFileName: false,
  checks: 'fixed checks',
};

describe('ImageKit upload integration', () => {
  beforeEach(() => axiosMock.post.mockReset());

  it('uploads only the file and backend-issued client-safe fields with progress', async () => {
    const progress = vi.fn();
    axiosMock.post.mockImplementationOnce(
      async (
        _url: string,
        body: FormData,
        config: { onUploadProgress: (event: { loaded: number; total: number }) => void },
      ) => {
        config.onUploadProgress({ loaded: 50, total: 100 });
        const fields = Object.fromEntries(body.entries());
        expect(fields).toMatchObject({
          fileName: authorization.fileName,
          folder: authorization.folder,
          publicKey: authorization.publicKey,
          token: authorization.token,
          signature: authorization.signature,
          expire: String(authorization.expire),
          useUniqueFileName: 'false',
          checks: authorization.checks,
        });
        expect(Object.keys(fields)).not.toContain('privateKey');
        expect(config).not.toHaveProperty('headers.Authorization');
        return { data: { fileId: ' provider-file-id ' } };
      },
    );

    const result = await uploadToImageKit({
      file: new Blob(['image'], { type: 'image/png' }) as File,
      authorization,
      onProgress: progress,
    });
    expect(axiosMock.post).toHaveBeenCalledWith(authorization.uploadUrl, expect.any(FormData), expect.any(Object));
    expect(progress).toHaveBeenCalledWith(50);
    expect(result).toEqual({ fileId: 'provider-file-id' });
  });

  it('rejects invalid provider responses and sanitizes provider failures', async () => {
    axiosMock.post.mockResolvedValueOnce({ data: {} });
    await expect(uploadToImageKit({ file: new Blob(['x']) as File, authorization })).rejects.toThrow(
      'invalid upload response',
    );
    axiosMock.post.mockRejectedValueOnce(new Error('response containing sensitive details'));
    await expect(uploadToImageKit({ file: new Blob(['x']) as File, authorization })).rejects.toThrow(
      'Image upload failed',
    );
  });
});
