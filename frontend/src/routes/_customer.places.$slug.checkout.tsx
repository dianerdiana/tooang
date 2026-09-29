import { createFileRoute, notFound } from '@tanstack/react-router';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';
import { CheckoutPage } from '@/features/orders/components/checkout-page';

import { isPublicPlaceSlug } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_customer/places/$slug/checkout')({
  beforeLoad: ({ params }) => {
    if (!isPublicPlaceSlug(params.slug)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Checkout | Tooang' }] }),
  component: CheckoutRoute,
});

function CheckoutRoute() {
  const { slug } = Route.useParams();
  const recovery = useProtectedActionRecovery({
    currentUrl: `/places/${slug}/checkout`,
    placeSlug: slug,
  });

  return (
    <>
      <ProtectedActionRecoveryNotice result={recovery} />
      <CheckoutPage slug={slug} />
    </>
  );
}
