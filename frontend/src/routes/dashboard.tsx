import { useEffect } from 'react';

import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';
import { DashboardShell } from '@/components/layouts/dashboard-shell';
import { PlaceSwitcher } from '@/components/layouts/place-switcher';

import { buildDashboardNavigation } from '@/configs/dashboard-navigation';

import { getDashboardAccessRedirect } from '@/utils/auth/dashboard-access';
import { parseDashboardSearch, resolveDashboardPlace } from '@/utils/dashboard-place';
import { useAuth } from '@/utils/hooks/use-auth';

export const Route = createFileRoute('/dashboard')({
  validateSearch: parseDashboardSearch,
  beforeLoad: ({ context, location, search }) => {
    const accessRedirect = getDashboardAccessRedirect(context.auth, location.href);
    if (accessRedirect) throw redirect(accessRedirect);

    const selectedPlace = resolveDashboardPlace(context.auth.user?.placeMemberships ?? [], search.placeId);
    const hasStalePlace = search.placeId !== undefined && search.placeId !== selectedPlace?.placeId;

    if (hasStalePlace && !location.pathname.startsWith('/dashboard/platform/')) {
      throw redirect({
        to: '/dashboard',
        search: selectedPlace ? { placeId: selectedPlace.placeId } : {},
        replace: true,
      });
    }

    return {
      selectedPlace,
    };
  },
  errorComponent: DashboardRouteError,
  component: DashboardLayoutRoute,
});

function DashboardLayoutRoute() {
  const { user } = useAuth();
  const { selectedPlace } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const isPlatformContext = useRouterState({
    select: ({ location }) => location.pathname.startsWith('/dashboard/platform/'),
  });

  useEffect(() => {
    const resolvedPlaceId = selectedPlace?.placeId;
    if (search.placeId === resolvedPlaceId) return;

    void navigate({
      search: (previous) => ({ ...previous, placeId: resolvedPlaceId }),
      replace: true,
    });
  }, [navigate, search.placeId, selectedPlace?.placeId]);

  if (!user) return null;

  const navigation = buildDashboardNavigation({ user, selectedPlace });

  return (
    <DashboardShell
      navigation={navigation}
      context={
        <PlaceSwitcher
          memberships={user.placeMemberships}
          selectedPlace={selectedPlace}
          isPlatformContext={isPlatformContext}
          onPlaceChange={(placeId) => void navigate({ to: '/dashboard', search: { placeId } })}
        />
      }
    >
      <Outlet />
    </DashboardShell>
  );
}
