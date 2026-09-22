import * as React from 'react';

import { Link, type LinkProps } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@/utils/utils';

type BreadcrumbItem = {
  id: string;
  label: React.ReactNode;
  to?: LinkProps['to'];
  search?: LinkProps['search'];
};

type BreadcrumbProps = React.ComponentProps<'nav'> & {
  items: readonly BreadcrumbItem[];
};

function Breadcrumb({ className, items, ...props }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label='Breadcrumb' className={cn('text-sm text-muted-foreground', className)} {...props}>
      <ol className='flex flex-wrap items-center gap-1.5'>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <React.Fragment key={item.id}>
              {index > 0 && <ChevronRightIcon aria-hidden='true' className='size-4 shrink-0' />}
              <li className='min-w-0'>
                {!isCurrent && item.to ? (
                  <Link
                    to={item.to}
                    search={item.search}
                    className='rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(isCurrent && 'font-medium text-foreground')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb, type BreadcrumbItem, type BreadcrumbProps };
