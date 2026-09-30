import { createFileRoute } from '@tanstack/react-router';

import { PublicOrderVerificationPage } from '@/features/orders/components/public-order-verification-page';

export const Route = createFileRoute('/_public/verify/$token')({
  head: () => ({ meta: [{ title: 'Verify order | Tooang' }] }),
  component: VerificationRoute,
});

function VerificationRoute() {
  const { token } = Route.useParams();
  return <PublicOrderVerificationPage token={token} />;
}
