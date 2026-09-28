import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/places/$slug/cart')({
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Cart | Tooang' }] }),
  component: CartRoute,
});

function CartRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Cart'
      title='Your place cart'
      description='The authenticated cart feature will render here.'
    />
  );
}
