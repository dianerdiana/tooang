import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/business-hours')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.businessHours),
  head: () => ({ meta: [{ title: 'Business Hours | Tooang' }] }),
  component: BusinessHoursRoute,
});

function BusinessHoursRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <DashboardPlaceholderPage
      title='Business hours'
      description={`Manage business hours for ${selectedPlace?.place.name}.`}
      search={search}
    />
  );
}
