import { createFileRoute, notFound } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import { isVerificationToken } from '@/utils/navigation/customer-route-params';

export const Route = createFileRoute('/_public/verify/$token')({
  beforeLoad: ({ params }) => {
    if (!isVerificationToken(params.token)) throw notFound();
  },
  head: () => ({ meta: [{ title: 'Verify order | Tooang' }] }),
  component: VerificationRoute,
});

function VerificationRoute() {
  return (
    <RoutePlaceholder
      eyebrow='Order verification'
      title='Verification is ready for its public result view'
      description='The token in this URL will be consumed by the public verification feature without requiring authentication.'
    />
  );
}
