import { Link } from '@tanstack/react-router';

import { DashboardNavigation, type DashboardNavigationGroup } from './dashboard-navigation';

type DashboardSidebarProps = {
  navigation: readonly DashboardNavigationGroup[];
};

function DashboardSidebar({ navigation }: DashboardSidebarProps) {
  return (
    <aside className='fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col'>
      <div className='flex h-16 shrink-0 items-center border-b border-sidebar-border px-6'>
        <Link
          to='/dashboard'
          className='rounded-sm text-xl font-extrabold tracking-tight text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'
        >
          Tooang
        </Link>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-3 py-6'>
        <DashboardNavigation groups={navigation} />
      </div>
    </aside>
  );
}

export { DashboardSidebar, type DashboardSidebarProps };
