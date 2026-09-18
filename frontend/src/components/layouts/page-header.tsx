import * as React from 'react';

import { cn } from '@/utils/utils';

type PageHeaderProps = Omit<React.ComponentProps<'header'>, 'title'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
};

function PageHeader({ className, title, description, leading, actions, ...props }: PageHeaderProps) {
  return (
    <header
      data-slot='page-header'
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
      {...props}
    >
      <div className='flex min-w-0 items-start gap-3'>
        {leading && <div className='mt-0.5 shrink-0'>{leading}</div>}
        <div className='min-w-0 space-y-1.5'>
          <h1 className='text-page-title font-semibold'>{title}</h1>
          {description && <div className='max-w-3xl text-sm text-muted-foreground sm:text-base'>{description}</div>}
        </div>
      </div>
      {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
    </header>
  );
}

export { PageHeader, type PageHeaderProps };
