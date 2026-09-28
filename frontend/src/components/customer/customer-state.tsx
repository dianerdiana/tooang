import type { ReactNode } from 'react';

import { FilterXIcon, InboxIcon, RotateCcwIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';

import { type CustomerRecoveryAction, getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import type { CustomerStatePresentation } from '@/utils/customer-state-presentation';
import { cn } from '@/utils/utils';

type CustomerContentSkeletonProps = {
  rows?: number;
  compact?: boolean;
  className?: string;
};

function CustomerContentSkeleton({ rows = 3, compact = false, className }: CustomerContentSkeletonProps) {
  return (
    <div data-slot='customer-content-skeleton' aria-label='Loading content' className={cn('space-y-4', className)}>
      <Skeleton className='h-7 w-2/5 max-w-64' />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cn('rounded-lg border p-4', compact ? 'space-y-2' : 'space-y-3')}>
          <Skeleton className='h-5 w-3/5' />
          <Skeleton className='h-4 w-full' />
          {!compact && <Skeleton className='h-4 w-4/5' />}
        </div>
      ))}
    </div>
  );
}

type CustomerErrorStateProps = {
  error: unknown;
  onAction?: (action: CustomerRecoveryAction) => void;
  isRecovering?: boolean;
  compact?: boolean;
  className?: string;
};

function CustomerErrorState({
  error,
  onAction,
  isRecovering = false,
  compact = false,
  className,
}: CustomerErrorStateProps) {
  const state = getCustomerErrorPresentation(error);

  return (
    <ErrorState
      className={className}
      title={state.title}
      description={state.description}
      tone={state.tone}
      compact={compact}
      onRetry={onAction ? () => onAction(state.action) : undefined}
      retryLabel={state.actionLabel}
      isRetrying={isRecovering}
    />
  );
}

type CustomerStateBannerProps = {
  presentation: CustomerStatePresentation;
  onAction?: () => void;
  className?: string;
};

function CustomerStateBanner({ presentation, onAction, className }: CustomerStateBannerProps) {
  return (
    <CustomerAlert
      className={className}
      tone={presentation.tone}
      title={presentation.title}
      description={presentation.description}
      action={
        presentation.action && presentation.actionLabel && onAction ? (
          <Button type='button' variant='outline' onClick={onAction}>
            {presentation.actionLabel}
          </Button>
        ) : undefined
      }
    />
  );
}

type CustomerDataStateProps = {
  children: ReactNode;
  isInitialLoading: boolean;
  hasData: boolean;
  isRefreshing?: boolean;
  error?: unknown;
  emptyKind?: 'empty' | 'no-results' | null;
  emptyTitle?: string;
  emptyDescription?: string;
  noResultsDescription?: string;
  loading?: ReactNode;
  emptyAction?: ReactNode;
  onRecoveryAction?: (action: CustomerRecoveryAction) => void;
  isRecovering?: boolean;
  compact?: boolean;
  className?: string;
};

function CustomerDataState({
  children,
  isInitialLoading,
  hasData,
  isRefreshing = false,
  error,
  emptyKind = null,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'There is no content to show yet.',
  noResultsDescription = 'No items match the current search or filters.',
  loading,
  emptyAction,
  onRecoveryAction,
  isRecovering = false,
  compact = false,
  className,
}: CustomerDataStateProps) {
  if (isInitialLoading && !hasData) {
    return <div className={className}>{loading ?? <CustomerContentSkeleton compact={compact} />}</div>;
  }

  if (error && !hasData) {
    return (
      <CustomerErrorState
        className={className}
        error={error}
        onAction={onRecoveryAction}
        isRecovering={isRecovering}
        compact={compact}
      />
    );
  }

  if (!hasData && emptyKind) {
    const noResults = emptyKind === 'no-results';
    return (
      <EmptyState
        className={className}
        compact={compact}
        icon={noResults ? FilterXIcon : InboxIcon}
        title={noResults ? 'No matching results' : emptyTitle}
        description={noResults ? noResultsDescription : emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {error !== undefined && error !== null && (
        <CustomerAlert
          tone='warning'
          title='Could not refresh this content'
          description='The information already shown is still available. Try refreshing again.'
          action={
            onRecoveryAction ? (
              <Button type='button' variant='outline' onClick={() => onRecoveryAction('retry')} disabled={isRecovering}>
                <RotateCcwIcon className={cn(isRecovering && 'animate-spin motion-reduce:animate-none')} aria-hidden />
                {isRecovering ? 'Refreshing…' : 'Refresh'}
              </Button>
            ) : undefined
          }
        />
      )}
      {isRefreshing && !error && (
        <div role='status' className='flex items-center gap-2 text-sm text-muted-foreground'>
          <span className='size-2 rounded-full bg-info' aria-hidden />
          Updating current information…
        </div>
      )}
      {children}
    </div>
  );
}

export {
  CustomerContentSkeleton,
  type CustomerContentSkeletonProps,
  CustomerDataState,
  type CustomerDataStateProps,
  CustomerErrorState,
  type CustomerErrorStateProps,
  CustomerStateBanner,
  type CustomerStateBannerProps,
};
