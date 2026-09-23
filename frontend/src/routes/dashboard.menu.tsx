import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { MenuCategoriesPage } from '@/features/menu-categories/components/menu-categories-page';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/menu')({
  beforeLoad: ({ context }) => requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.menu),
  head: () => ({ meta: [{ title: 'Menu | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: MenuRoute,
});

function MenuRoute() {
  const { selectedPlace } = Route.useRouteContext();
  if (!selectedPlace) return null;
  return <MenuCategoriesPage placeId={selectedPlace.placeId} />;
}
