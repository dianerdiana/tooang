import type { ReactNode } from 'react';

import { Outlet } from '@tanstack/react-router';

import { ContextualCustomerNavigation } from '@/components/navigation/customer-navigation';

import { cn } from '@/utils/utils';

type PublicShellProps = {
  children?: ReactNode;
  className?: string;
  navigation?: ReactNode;
};

function PublicShell({ children, className, navigation }: PublicShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background pb-[calc(4rem+var(--safe-area-bottom))] text-foreground md:pb-0',
        className,
      )}
    >
      {navigation ?? <ContextualCustomerNavigation />}
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
