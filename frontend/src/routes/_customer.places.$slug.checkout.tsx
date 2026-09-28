import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/places/$slug/checkout')({
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Checkout | Tooang' }] }),
  component: CheckoutRoute,
});

function CheckoutRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Checkout'
      title='Complete your order'
      description='The authenticated checkout feature will render here after its contract-dependent tasks are complete.'
    />
  );
}
