import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/places')({
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.places),
  head: () => ({ meta: [{ title: 'Platform Places | Tooang' }] }),
  component: PlatformPlacesRoute,
});

function PlatformPlacesRoute() {
  return (
    <DashboardPlaceholderPage
      title='Places'
      description='Manage places across the Tooang platform.'
      search={Route.useSearch()}
      scopeLabel='Platform'
    />
  );
}
