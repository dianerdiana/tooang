import { createFileRoute, useRouterState } from '@tanstack/react-router';

import { CustomerOrdersPage } from '@/features/orders/components/customer-orders-page';
import {
  compactCustomerOrderSearch,
  normalizeCustomerOrderSearch,
  parseCustomerOrderSearch,
} from '@/features/orders/schemas/customer-order-list.schema';

export const Route = createFileRoute('/_customer/orders')({
  validateSearch: parseCustomerOrderSearch,
  head: () => ({ meta: [{ title: 'Your orders | Tooang' }] }),
  component: OrdersRoute,
});

function OrdersRoute() {
  const filters = normalizeCustomerOrderSearch(Route.useSearch());
  const navigate = Route.useNavigate();
  const currentUrl = useRouterState({ select: (state) => state.location.href });
  return (
    <CustomerOrdersPage
      filters={filters}
      currentUrl={currentUrl}
      onFiltersChange={(next, options) =>
        void navigate({ search: compactCustomerOrderSearch(next), replace: options?.replace })
      }
    />
  );
}
