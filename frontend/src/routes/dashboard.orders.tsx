import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { OrderQueuePage } from '@/features/orders/components/order-queue-page';
import { parseOrderQueueSearch } from '@/features/orders/schemas/order-list.schema';

import { requirePlaceDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/orders')({
  validateSearch: parseOrderQueueSearch,
  beforeLoad: ({ context }) => requirePlaceDashboardRoute(context.selectedPlace, [PERMISSION.ORDER_READ]),
  head: () => ({ meta: [{ title: 'Orders | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: OrdersRoute,
});

function OrdersRoute() {
  const { selectedPlace } = Route.useRouteContext();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  if (!selectedPlace) return null;

  return (
    <OrderQueuePage
      key={selectedPlace.placeId}
      placeId={selectedPlace.placeId}
      placeName={selectedPlace.place.name}
      filters={filters}
      onFiltersChange={(nextFilters) => void navigate({ search: nextFilters })}
    />
  );
}
