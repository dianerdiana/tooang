import { type ReactNode, useState } from 'react';

import { Sheet } from '@/components/ui/sheet';

import { DashboardMobileNavigation } from './dashboard-mobile-navigation';
import type { DashboardNavigationGroup } from './dashboard-navigation';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardTopbar } from './dashboard-topbar';

type DashboardShellProps = {
  children: ReactNode;
  navigation: readonly DashboardNavigationGroup[];
  context?: ReactNode;
};

function DashboardShell({ children, context, navigation }: DashboardShellProps) {
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  return (
    <div className='min-h-dvh bg-background text-foreground'>
      <a
        href='#dashboard-main'
        className='fixed top-3 left-3 z-[60] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-overlay transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 motion-reduce:transition-none'
      >
        Skip to main content
      </a>
      <DashboardSidebar navigation={navigation} />
      <div className='min-h-dvh lg:pl-64'>
        <Sheet open={isMobileNavigationOpen} onOpenChange={setIsMobileNavigationOpen}>
          <DashboardTopbar context={context} />
          <DashboardMobileNavigation navigation={navigation} onNavigate={() => setIsMobileNavigationOpen(false)} />
        </Sheet>
        <main id='dashboard-main' tabIndex={-1} className='min-h-[calc(100dvh-4rem)] focus:outline-none'>
          <div className='mx-auto flex w-full max-w-screen-2xl flex-col gap-section px-page py-6 sm:py-8'>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export { DashboardShell, type DashboardShellProps };
