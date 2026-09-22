import { createFileRoute } from '@tanstack/react-router';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { ManagementPlacesPage } from '@/features/places/components/management-places-page';
import { parsePlacesSearch } from '@/features/places/schemas/places.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/places')({
  validateSearch: parsePlacesSearch,
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.places),
  head: () => ({ meta: [{ title: 'Platform Places | Tooang' }] }),
  component: PlatformPlacesRoute,
});

function PlatformPlacesRoute() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ManagementPlacesPage
      key={`${filters.search ?? ''}:${filters.city ?? ''}`}
      filters={filters}
      onFiltersChange={(nextFilters) => void navigate({ search: nextFilters })}
    />
  );
}
