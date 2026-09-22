import { createFileRoute } from '@tanstack/react-router';

import { DashboardOverview } from '@/features/orders/components/dashboard-overview';

import { useAuth } from '@/utils/hooks/use-auth';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({ meta: [{ title: 'Management Dashboard | Tooang' }] }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user } = useAuth();
  const { selectedPlace } = Route.useRouteContext();

  if (!user) return null;

  return <DashboardOverview user={user} selectedPlace={selectedPlace} />;
}
