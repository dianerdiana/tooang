import { createFileRoute } from '@tanstack/react-router';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { PlaceManagementPage } from '@/features/places/components/place-management-page';
import { parsePlacesSearch } from '@/features/places/schemas/places.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/places_/$placeId')({
  validateSearch: parsePlacesSearch,
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.places),
  head: () => ({ meta: [{ title: 'Place Details | Tooang' }] }),
  component: PlatformPlaceDetailRoute,
});

function PlatformPlaceDetailRoute() {
  const { placeId } = Route.useParams();
  const listSearch = Route.useSearch();
  return <PlaceManagementPage placeId={placeId} platformContext listSearch={listSearch} />;
}
