import { useEffect, useId, useState } from 'react';

import { Input } from '@/components/ui/input';

import { validateMediaFile } from '../schemas/media.schema';
import { MEDIA_FILE_ACCEPT } from '../types/media.type';

export function MediaFilePicker({
  label,
  file,
  onChange,
  disabled,
}: {
  label: string;
  file?: File;
  onChange: (file: File | undefined) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  return (
    <div className='space-y-3 rounded-md border p-3'>
      {previewUrl ? (
        <img src={previewUrl} alt={`${label} preview`} className='aspect-video w-full rounded-md object-cover' />
      ) : (
        <div className='flex aspect-video items-center justify-center rounded-md bg-muted text-sm text-muted-foreground'>
          No image selected
        </div>
      )}
      <div className='space-y-1.5'>
        <label htmlFor={inputId} className='text-sm font-medium'>
          {label}
        </label>
        <Input
          id={inputId}
          type='file'
          accept={MEDIA_FILE_ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            setError(undefined);
            const selected = event.target.files?.[0];
            if (!selected) {
              setPreviewUrl(undefined);
              return onChange(undefined);
            }
            try {
              validateMediaFile(selected);
              setPreviewUrl(URL.createObjectURL(selected));
              onChange(selected);
            } catch (selectionError) {
              setPreviewUrl(undefined);
              onChange(undefined);
              setError(selectionError instanceof Error ? selectionError.message : 'Choose a supported image.');
            }
          }}
        />
        <p className='text-xs text-muted-foreground'>Optional. JPEG, PNG, WebP, or AVIF; maximum 5 MB.</p>
        {file && <p className='text-xs text-muted-foreground'>{file.name}</p>}
        {error && (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
