import * as React from 'react';

import { ImageIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/utils/utils';

const aspectClasses = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-video',
} as const;

type ResponsiveImageProps = Omit<React.ComponentProps<'img'>, 'children'> & {
  aspect?: keyof typeof aspectClasses;
  fallbackLabel?: string;
  fit?: 'cover' | 'contain';
  loadingState?: boolean;
};

function ResponsiveImage({
  alt,
  aspect = 'landscape',
  className,
  fallbackLabel = 'Image unavailable',
  fit = 'cover',
  loadingState = false,
  onError,
  src,
  ...props
}: ResponsiveImageProps) {
  const [failed, setFailed] = React.useState(false);

  if (loadingState) {
    return (
      <Skeleton aria-label='Loading image' className={cn('w-full rounded-lg', aspectClasses[aspect], className)} />
    );
  }

  if (!src || failed) {
    return (
      <div
        role='img'
        aria-label={alt || fallbackLabel}
        className={cn(
          'flex w-full items-center justify-center rounded-lg bg-surface-subtle text-disabled-foreground',
          aspectClasses[aspect],
          className,
        )}
      >
        <span className='flex flex-col items-center gap-2 px-4 text-center text-sm'>
          <ImageIcon className='size-6' aria-hidden />
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-lg bg-surface-subtle', aspectClasses[aspect], className)}>
      <img
        alt={alt}
        src={src}
        className={cn('size-full', fit === 'contain' ? 'object-contain p-6' : 'object-cover')}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
        {...props}
      />
    </div>
  );
}

export { ResponsiveImage, type ResponsiveImageProps };
