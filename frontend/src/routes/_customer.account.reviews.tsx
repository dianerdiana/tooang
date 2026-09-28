import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

export const Route = createFileRoute('/_customer/account/reviews')({
  head: () => ({ meta: [{ title: 'Your reviews | Tooang' }] }),
  component: ReviewsRoute,
});

function ReviewsRoute() {
  return (
    <RoutePlaceholder eyebrow='Account' title='Your reviews' description='Customer review history will render here.' />
  );
}
