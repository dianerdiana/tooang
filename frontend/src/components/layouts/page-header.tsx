import * as React from 'react';

import { cn } from '@/utils/utils';

import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

type PageHeaderProps = Omit<React.ComponentProps<'header'>, 'title'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: readonly BreadcrumbItem[];
};

function PageHeader({ className, title, description, leading, actions, breadcrumbs, ...props }: PageHeaderProps) {
  return (
    <header
      data-slot='page-header'
      className={cn('grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start', className)}
      {...props}
    >
      <div className='min-w-0 space-y-3'>
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
        <div className='flex min-w-0 items-start gap-3'>
          {leading && <div className='mt-0.5 shrink-0'>{leading}</div>}
          <div className='min-w-0 space-y-1.5'>
            <h1 className='text-page-title font-semibold'>{title}</h1>
            {description && <div className='max-w-3xl text-sm text-muted-foreground sm:text-base'>{description}</div>}
          </div>
        </div>
      </div>
      {actions && <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>{actions}</div>}
    </header>
  );
}

export { PageHeader, type PageHeaderProps };
