import type { ReactNode } from 'react';

import { Outlet } from '@tanstack/react-router';

import { TooangWordmark } from '@/components/branding/tooang-wordmark';

import { cn } from '@/utils/utils';

type PublicShellProps = {
  children?: ReactNode;
  className?: string;
};

function PublicShell({ children, className }: PublicShellProps) {
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
      <footer className='border-t bg-surface px-page py-6 text-center text-sm text-muted-foreground'>
        Discover local places with Tooang.
      </footer>
    </div>
  );
}

export { PublicShell, type PublicShellProps };
