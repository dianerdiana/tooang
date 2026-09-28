import type { ReactNode } from 'react';

import { Outlet } from '@tanstack/react-router';

import { CustomerNavigation } from '@/components/navigation/customer-navigation';

import { cn } from '@/utils/utils';

type CustomerShellProps = {
  children?: ReactNode;
  className?: string;
  navigation?: ReactNode;
};

function CustomerShell({ children, className, navigation }: CustomerShellProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background pb-[calc(4rem+var(--safe-area-bottom))] text-foreground md:pb-0',
        className,
      )}
    >
      {navigation ?? <CustomerNavigation />}
      <main id='main-content' className='min-w-0 flex-1' tabIndex={-1}>
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export { CustomerShell, type CustomerShellProps };
