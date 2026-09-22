import { createFileRoute } from '@tanstack/react-router';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { PlaceManagementPage } from '@/features/places/components/place-management-page';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/settings')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.settings),
  head: () => ({ meta: [{ title: 'Place Settings | Tooang' }] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { selectedPlace } = Route.useRouteContext();
  if (!selectedPlace) return null;
  return <PlaceManagementPage placeId={selectedPlace.placeId} />;
}
