import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { CreatePlacePage } from '@/features/places/components/create-place-page';
import { parsePlacesSearch } from '@/features/places/schemas/places.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/platform/places_/new')({
  validateSearch: parsePlacesSearch,
  beforeLoad: ({ context }) => requirePlatformDashboardRoute(context.auth.user, [PERMISSION.PLACE_CREATE]),
  head: () => ({ meta: [{ title: 'Create Place | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: CreatePlaceRoute,
});

function CreatePlaceRoute() {
  return <CreatePlacePage listSearch={Route.useSearch()} />;
}
