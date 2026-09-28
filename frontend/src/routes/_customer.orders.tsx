import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

export const Route = createFileRoute('/_customer/orders')({
  head: () => ({ meta: [{ title: 'Your orders | Tooang' }] }),
  component: OrdersRoute,
});

function OrdersRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Orders'
      title='Your orders'
      description='Authenticated order history will render here.'
    />
  );
}
