import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { isOrderId } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/orders/$orderId')({
  beforeLoad: ({ params }) => {
    if (!isOrderId(params.orderId)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Order details | Tooang' }] }),
  component: OrderDetailRoute,
});

function OrderDetailRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Order details'
      title='Your order'
      description='The authenticated order detail feature will render here without exposing another customer’s order.'
    />
  );
}
