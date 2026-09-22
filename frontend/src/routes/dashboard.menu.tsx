import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/menu')({
  beforeLoad: ({ context }) => requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.menu),
  head: () => ({ meta: [{ title: 'Menu | Tooang' }] }),
  component: MenuRoute,
});

function MenuRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <DashboardPlaceholderPage
      title='Menu'
      description={`Manage the menu for ${selectedPlace?.place.name}.`}
      search={search}
    />
  );
}
