import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { MembersPage } from '@/features/place-members/components/place-members-page';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: ({ context }) =>
    requirePlaceDashboardRoute(context.selectedPlace, dashboardRoutePermissions.place.members),
  head: () => ({ meta: [{ title: 'Members | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: MembersRoute,
});

function MembersRoute() {
  const { selectedPlace } = Route.useRouteContext();
  if (!selectedPlace) return null;
  return <MembersPage placeId={selectedPlace.placeId} placeName={selectedPlace.place.name} />;
}
