import { createFileRoute } from '@tanstack/react-router';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { BusinessHoursPage } from '@/features/business-hours/components/business-hours-page';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/business-hours')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.businessHours),
  head: () => ({ meta: [{ title: 'Business Hours | Tooang' }] }),
  component: BusinessHoursRoute,
});

function BusinessHoursRoute() {
  const { selectedPlace } = Route.useRouteContext();
  if (!selectedPlace) return null;
  return <BusinessHoursPage placeId={selectedPlace.placeId} />;
}
