import type { ReactNode } from 'react';

import { Outlet } from '@tanstack/react-router';

import { TooangWordmark } from '@/components/branding/tooang-wordmark';

import { cn } from '@/utils/utils';

type CustomerShellProps = {
  children?: ReactNode;
  className?: string;
};

function CustomerShell({ children, className }: CustomerShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
      <header className='border-b bg-surface'>
        <div className='mx-auto flex h-16 w-full max-w-7xl items-center px-page'>
          <a
            href='/'
            aria-label='Tooang home'
            className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <TooangWordmark />
          </a>
        </div>
      </header>
      <main id='main-content' className='min-w-0 flex-1' tabIndex={-1}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export { CustomerShell, type CustomerShellProps };
