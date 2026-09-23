import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { DiningTablesPage } from '@/features/dining-tables/components/dining-tables-page';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/dining-tables')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.diningTables),
  head: () => ({ meta: [{ title: 'Dining Tables | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: DiningTablesRoute,
});

function DiningTablesRoute() {
  const { selectedPlace } = Route.useRouteContext();
  if (!selectedPlace) return null;
  return <DiningTablesPage placeId={selectedPlace.placeId} />;
}
