import * as React from 'react';

import { AlertCircle, Ban, RefreshCw, RotateCcw, SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { cn } from '@/utils/utils';

type ErrorStateProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  isRetrying?: boolean;
  secondaryAction?: React.ReactNode;
  tone?: 'error' | 'forbidden' | 'not-found' | 'conflict';
  compact?: boolean;
};

function ErrorState({
  className,
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  isRetrying = false,
  secondaryAction,
  tone = 'error',
  compact = false,
  ...props
}: ErrorStateProps) {
  const Icon =
    tone === 'forbidden' ? Ban : tone === 'not-found' ? SearchX : tone === 'conflict' ? RefreshCw : AlertCircle;

  return (
    <div
      data-slot='error-state'
      role='alert'
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 text-center',
        compact ? 'min-h-40 py-8' : 'min-h-64 py-12',
        className,
      )}
      {...props}
    >
      <div className='mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
        <Icon className='size-5' aria-hidden />
      </div>
      <h3 className='text-base font-semibold'>{title}</h3>
      {description && <div className='mt-1 max-w-md text-sm text-muted-foreground'>{description}</div>}
      {(onRetry || secondaryAction) && (
        <div className='mt-5 flex flex-wrap items-center justify-center gap-2'>
          {onRetry && (
            <Button variant='outline' size='sm' onClick={onRetry} disabled={isRetrying}>
              <RotateCcw className={cn(isRetrying && 'animate-spin')} aria-hidden />
              {isRetrying ? 'Retrying…' : retryLabel}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export { ErrorState, type ErrorStateProps };
