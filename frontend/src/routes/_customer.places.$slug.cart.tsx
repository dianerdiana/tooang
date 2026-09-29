import { createFileRoute, notFound } from '@tanstack/react-router';

import { CartPage } from '@/features/cart/components/cart-page';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/places/$slug/cart')({
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Cart | Tooang' }] }),
  component: CartRoute,
});

function CartRoute() {
  const { slug } = Route.useParams();
  return <CartPage slug={slug} />;
}
