import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/dining-tables')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.diningTables),
  head: () => ({ meta: [{ title: 'Dining Tables | Tooang' }] }),
  component: DiningTablesRoute,
});

function DiningTablesRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <DashboardPlaceholderPage
      title='Dining tables'
      description={`View dining tables for ${selectedPlace?.place.name}.`}
      search={search}
    />
  );
}
