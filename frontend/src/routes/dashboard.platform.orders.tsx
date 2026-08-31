import { createFileRoute } from '@tanstack/react-router';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { GlobalOrdersPage } from '@/features/orders/components/global-orders-page';
import { parseGlobalOrderSearch } from '@/features/orders/schemas/global-order-list.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/orders')({
  validateSearch: parseGlobalOrderSearch,
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.orders),
  head: () => ({ meta: [{ title: 'Platform Orders | Tooang' }] }),
  component: PlatformOrdersRoute,
});

function PlatformOrdersRoute() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  return <GlobalOrdersPage filters={filters} onFiltersChange={(next) => void navigate({ search: next })} />;
}
