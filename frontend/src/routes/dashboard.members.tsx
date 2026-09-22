import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.members),
  head: () => ({ meta: [{ title: 'Members | Tooang' }] }),
  component: MembersRoute,
});

function MembersRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <DashboardPlaceholderPage
      title='Members'
      description={`Manage members for ${selectedPlace?.place.name}.`}
      search={search}
    />
  );
}
