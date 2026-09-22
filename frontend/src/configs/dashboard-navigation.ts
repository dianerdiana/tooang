import { LayoutDashboardIcon } from 'lucide-react';

import type { DashboardNavigationGroup } from '@/components/layouts/dashboard-navigation';

const baseDashboardNavigation = [
  {
    id: 'general',
    label: 'General',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        to: '/dashboard',
        icon: LayoutDashboardIcon,
        exact: true,
      },
    ],
  },
] as const satisfies readonly DashboardNavigationGroup[];

export { baseDashboardNavigation };
