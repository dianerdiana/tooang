import * as React from 'react';

import { Inbox } from 'lucide-react';

import { cn } from '@/utils/utils';

type EmptyStateProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
};

function EmptyState({
  className,
  icon: Icon = Inbox,
  title = 'No results found',
  description,
  action,
  compact = false,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot='empty-state'
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center',
        compact ? 'min-h-40 py-8' : 'min-h-64 py-12',
        className,
      )}
      {...props}
    >
      <div className='mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground'>
        <Icon className='size-5' aria-hidden />
      </div>
      <h3 className='text-base font-semibold'>{title}</h3>
      {description && <div className='mt-1 max-w-md text-sm text-muted-foreground'>{description}</div>}
      {action && <div className='mt-5'>{action}</div>}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
