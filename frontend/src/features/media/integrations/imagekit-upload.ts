// Provider uploads intentionally bypass the Tooang JWT client and use backend-issued authorization only.
// eslint-disable-next-line no-restricted-imports
import axios from 'axios';

import type { ImageKitUploadResult, MediaUploadAuthorization, UploadProgressHandler } from '../types/media.type';

const appendAuthorization = (form: FormData, authorization: MediaUploadAuthorization) => {
  form.append('fileName', authorization.fileName);
  form.append('folder', authorization.folder);
  form.append('publicKey', authorization.publicKey);
  form.append('token', authorization.token);
  form.append('signature', authorization.signature);
  form.append('expire', String(authorization.expire));
  form.append('useUniqueFileName', String(authorization.useUniqueFileName));
  form.append('checks', authorization.checks);
};

export const uploadToImageKit = async ({
  file,
  authorization,
  signal,
  onProgress,
}: {
  file: File;
  authorization: MediaUploadAuthorization;
  signal?: AbortSignal;
  onProgress?: UploadProgressHandler;
}): Promise<ImageKitUploadResult> => {
  const form = new FormData();
  form.append('file', file);
  appendAuthorization(form, authorization);

  try {
    const response = await axios.post<unknown>(authorization.uploadUrl, form, {
      signal,
      onUploadProgress: ({ loaded, total }) => {
        if (!total || total <= 0) return;
        onProgress?.(Math.min(100, Math.round((loaded / total) * 100)));
      },
    });
    const data = response.data;
    if (
      !data ||
      typeof data !== 'object' ||
      !('fileId' in data) ||
      typeof data.fileId !== 'string' ||
      !data.fileId.trim()
    ) {
      throw new Error('Image provider returned an invalid upload response.');
    }
    return { fileId: data.fileId.trim() };
  } catch (error) {
    if (axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new Error('Image upload was cancelled.', { cause: error });
    }
    if (error instanceof Error && error.message === 'Image provider returned an invalid upload response.') throw error;
    throw new Error('Image upload failed. Check your connection and try again.', { cause: error });
  }
};
