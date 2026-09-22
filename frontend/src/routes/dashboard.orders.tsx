import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/orders')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.orders),
  head: () => ({ meta: [{ title: 'Orders | Tooang' }] }),
  component: OrdersRoute,
});

function OrdersRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <DashboardPlaceholderPage
      title='Orders'
      description={`Manage orders for ${selectedPlace?.place.name}.`}
      search={search}
    />
  );
}
