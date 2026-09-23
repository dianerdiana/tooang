import { useEffect, useId, useState } from 'react';

import { ImageUpIcon, Loader2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

import { useMediaUpload } from '../queries/media-upload.mutation';
import { validateMediaFile } from '../schemas/media.schema';
import { MEDIA_FILE_ACCEPT, type MediaTargetIdentity, type MediaUploadResult } from '../types/media.type';

export function MediaUploadControl({
  target,
  currentImageUrl,
  label = 'Image',
  onUploaded,
  onReset,
}: {
  target: MediaTargetIdentity;
  currentImageUrl?: string | null;
  label?: string;
  onUploaded?: (result: MediaUploadResult) => void;
  onReset?: () => void;
}) {
  const inputId = useId();
  const workflow = useMediaUpload();
  const [file, setFile] = useState<File>();
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>();
  const [validationError, setValidationError] = useState<string>();

  useEffect(
    () => () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    },
    [localPreviewUrl],
  );

  const clear = () => {
    workflow.reset();
    setFile(undefined);
    setLocalPreviewUrl(undefined);
    setValidationError(undefined);
    onReset?.();
  };

  const submit = async () => {
    if (!file) return;
    try {
      const result = await workflow.upload(file, target);
      onUploaded?.(result);
      toast.success(`${label} uploaded.`);
    } catch {
      // The workflow exposes a safe error message for rendering.
    }
  };

  return (
    <div className='space-y-4 rounded-surface border bg-surface p-4'>
      <div className='overflow-hidden rounded-md border bg-muted/30'>
        {localPreviewUrl || currentImageUrl ? (
          <img
            src={localPreviewUrl ?? currentImageUrl ?? undefined}
            alt={`${label} preview`}
            className='aspect-video w-full object-cover'
          />
        ) : (
          <div className='flex aspect-video items-center justify-center text-sm text-muted-foreground'>
            No {label.toLowerCase()}
          </div>
        )}
      </div>
      <div className='space-y-1.5'>
        <label htmlFor={inputId} className='text-sm font-medium'>
          {label} file
        </label>
        <Input
          id={inputId}
          type='file'
          accept={MEDIA_FILE_ACCEPT}
          disabled={workflow.isPending}
          onChange={(event) => {
            workflow.reset();
            const selected = event.target.files?.[0];
            setFile(undefined);
            setLocalPreviewUrl(undefined);
            setValidationError(undefined);
            if (!selected) return;
            try {
              validateMediaFile(selected);
              setFile(selected);
              setLocalPreviewUrl(URL.createObjectURL(selected));
            } catch (error) {
              setValidationError(error instanceof Error ? error.message : 'Choose a supported image.');
            }
          }}
        />
        <p className='text-xs text-muted-foreground'>JPEG, PNG, WebP, or AVIF. Maximum 5 MB.</p>
      </div>

      {file && (
        <p className='text-sm'>
          {file.name} · {(file.size / 1_048_576).toFixed(2)} MB
        </p>
      )}

      {workflow.isPending && (
        <div role='status' aria-live='polite' className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span>{workflow.phase}</span>
            <span>{workflow.progress}%</span>
          </div>
          <Progress value={workflow.progress} aria-label='Image upload progress' />
        </div>
      )}

      {(validationError || workflow.error) && (
        <p role='alert' className='text-sm text-destructive'>
          {validationError ?? workflow.error}
        </p>
      )}
      {workflow.phase === 'success' && (
        <p role='status' className='text-sm text-success'>
          Image uploaded successfully.
        </p>
      )}

      <div className='flex flex-wrap justify-end gap-2'>
        {(file || workflow.phase !== 'idle') && (
          <Button type='button' variant='outline' onClick={clear} disabled={workflow.isPending}>
            <XIcon aria-hidden /> Reset
          </Button>
        )}
        {workflow.isPending ? (
          <Button type='button' variant='destructive' onClick={workflow.cancel}>
            Cancel upload
          </Button>
        ) : (
          <Button type='button' onClick={() => void submit()} disabled={!file || Boolean(validationError)}>
            {workflow.phase === 'authorizing' ? (
              <Loader2Icon className='animate-spin' aria-hidden />
            ) : (
              <ImageUpIcon aria-hidden />
            )}
            {currentImageUrl ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </Button>
        )}
      </div>
    </div>
  );
}
