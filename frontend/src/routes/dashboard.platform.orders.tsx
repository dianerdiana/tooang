import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/orders')({
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.orders),
  head: () => ({ meta: [{ title: 'Platform Orders | Tooang' }] }),
  component: PlatformOrdersRoute,
});

function PlatformOrdersRoute() {
  return (
    <DashboardPlaceholderPage
      title='Orders'
      description='Inspect globally accessible Tooang orders.'
      search={Route.useSearch()}
      scopeLabel='Platform'
    />
  );
}
