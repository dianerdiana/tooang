import * as React from 'react';

import { Loader2 } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/utils/utils';

type LoadingStateProps = React.ComponentProps<'div'> & {
  label?: string;
  fullscreen?: boolean;
  compact?: boolean;
};

function LoadingState({
  className,
  label = 'Loading',
  fullscreen = false,
  compact = false,
  ...props
}: LoadingStateProps) {
  return (
    <div
      data-slot='loading-state'
      role='status'
      aria-live='polite'
      className={cn(
        'flex items-center justify-center gap-2 text-sm text-muted-foreground',
        fullscreen ? 'min-h-screen' : compact ? 'min-h-40' : 'min-h-64',
        className,
      )}
      {...props}
    >
      <Loader2 className='size-5 animate-spin text-primary' aria-hidden />
      <span>{label}</span>
    </div>
  );
}

type TableSkeletonProps = React.ComponentProps<'div'> & {
  rows?: number;
  columns?: number;
};

function TableSkeleton({ className, rows = 5, columns = 4, ...props }: TableSkeletonProps) {
  return (
    <div
      data-slot='table-skeleton'
      role='status'
      aria-label='Loading table data'
      className={cn('space-y-3', className)}
      {...props}
    >
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className='grid min-w-xl grid-flow-col auto-cols-fr gap-4 px-4 py-2'>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton key={columnIndex} className={cn('h-4', columnIndex === 0 ? 'w-3/4' : 'w-full')} />
          ))}
        </div>
      ))}
      <span className='sr-only'>Loading table data</span>
    </div>
  );
}

export { LoadingState, type LoadingStateProps, TableSkeleton, type TableSkeletonProps };
