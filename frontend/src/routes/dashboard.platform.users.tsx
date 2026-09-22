import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/users')({
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.users),
  head: () => ({ meta: [{ title: 'Platform Users | Tooang' }] }),
  component: PlatformUsersRoute,
});

function PlatformUsersRoute() {
  return (
    <DashboardPlaceholderPage
      title='Users'
      description='Manage globally accessible Tooang users.'
      search={Route.useSearch()}
      scopeLabel='Platform'
    />
  );
}
