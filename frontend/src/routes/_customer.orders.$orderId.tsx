import { createFileRoute, notFound } from '@tanstack/react-router';

import { CustomerOrderDetailPage } from '@/features/orders/components/customer-order-detail-page';
import { parseCustomerOrderDetailSearch } from '@/features/orders/schemas/order-detail.schema';

import { isOrderId } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/orders/$orderId')({
  validateSearch: parseCustomerOrderDetailSearch,
  beforeLoad: ({ params }) => {
    if (!isOrderId(params.orderId)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Order details | Tooang' }] }),
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  const { orderId } = Route.useParams();
  const { placed, place } = Route.useSearch();
  return <CustomerOrderDetailPage orderId={orderId} placed={placed} placeSlug={place} />;
}
