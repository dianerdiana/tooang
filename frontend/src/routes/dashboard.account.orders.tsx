import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { MyOrdersPage } from '@/features/orders/components/my-orders-page';
import { parseOrderQueueSearch } from '@/features/orders/schemas/order-list.schema';

import { requireAccountDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/account/orders')({
  validateSearch: parseOrderQueueSearch,
  beforeLoad: ({ context }) => requireAccountDashboardRoute(context.auth.user, [PERMISSION.ORDER_READ]),
  head: () => ({ meta: [{ title: 'My Orders | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: RouteComponent,
});

function RouteComponent() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  return <MyOrdersPage filters={filters} onFiltersChange={(next) => void navigate({ search: next })} />;
}
