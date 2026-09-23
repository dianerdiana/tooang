import { useCallback, useRef, useState } from 'react';

import { getSafeMutationError } from '@/utils/dashboard-error';

import { uploadToImageKit } from '../integrations/imagekit-upload';
import { toCreateUploadIntent } from '../schemas/media.schema';
import { mediaService } from '../services/media.service';
import type {
  MediaTargetIdentity,
  MediaUploadPhase,
  MediaUploadResult,
  UploadProgressHandler,
} from '../types/media.type';

export const mediaUploadErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Image upload was cancelled.';
  if (error instanceof Error && error.message === 'Image upload was cancelled.') return error.message;
  if (error instanceof Error && error.message === 'Image provider returned an invalid upload response.') {
    return 'The image provider returned an invalid response. Please try again.';
  }
  return getSafeMutationError(error, 'Unable to upload this image. Please try again.');
};

export const executeMediaUpload = async ({
  file,
  target,
  signal,
  onPhaseChange,
  onProgress,
}: {
  file: File;
  target: MediaTargetIdentity;
  signal?: AbortSignal;
  onPhaseChange?: (phase: MediaUploadPhase) => void;
  onProgress?: UploadProgressHandler;
}): Promise<MediaUploadResult> => {
  const input = toCreateUploadIntent(file, target);
  onProgress?.(0);
  onPhaseChange?.('authorizing');
  const authorization = await mediaService.createUploadIntent(input);
  if (signal?.aborted) throw new Error('Image upload was cancelled.');

  onPhaseChange?.('uploading');
  const uploaded = await uploadToImageKit({ file, authorization, signal, onProgress });
  if (signal?.aborted) throw new Error('Image upload was cancelled.');

  onPhaseChange?.('completing');
  const result = await mediaService.completeUploadIntent(authorization.intentId, { fileId: uploaded.fileId });
  onProgress?.(100);
  onPhaseChange?.('success');
  return result;
};

export const useMediaUpload = () => {
  const controller = useRef<AbortController | undefined>(undefined);
  const [phase, setPhase] = useState<MediaUploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<MediaUploadResult>();

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = undefined;
    setPhase('idle');
    setProgress(0);
    setError(undefined);
    setResult(undefined);
  }, []);

  const cancel = useCallback(() => controller.current?.abort(), []);

  const upload = useCallback(async (file: File, target: MediaTargetIdentity) => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setError(undefined);
    setResult(undefined);
    try {
      const nextResult = await executeMediaUpload({
        file,
        target,
        signal: nextController.signal,
        onPhaseChange: setPhase,
        onProgress: setProgress,
      });
      setResult(nextResult);
      return nextResult;
    } catch (uploadError) {
      setPhase('error');
      setError(mediaUploadErrorMessage(uploadError));
      throw uploadError;
    } finally {
      if (controller.current === nextController) controller.current = undefined;
    }
  }, []);

  return {
    phase,
    progress,
    error,
    result,
    isPending: phase === 'authorizing' || phase === 'uploading' || phase === 'completing',
    upload,
    cancel,
    reset,
  };
};
