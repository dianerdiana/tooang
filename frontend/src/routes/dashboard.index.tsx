import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { DashboardOverview } from '@/features/orders/components/dashboard-overview';

import { useAuth } from '@/utils/hooks/use-auth';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'Management Dashboard | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user } = useAuth();
  const { selectedPlace } = Route.useRouteContext();

  if (!user) return null;

  return <DashboardOverview user={user} selectedPlace={selectedPlace} />;
}
