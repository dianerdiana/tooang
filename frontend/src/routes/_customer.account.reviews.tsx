import { createFileRoute } from '@tanstack/react-router';

import { RoutePlaceholder } from '@/components/pages/route-placeholder';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';

export const Route = createFileRoute('/_customer/account/reviews')({
  head: () => ({ meta: [{ title: 'Your reviews | Tooang' }] }),
  component: ReviewsRoute,
});

function ReviewsRoute() {
  const recovery = useProtectedActionRecovery({ currentUrl: '/account/reviews' });

  return (
    <RoutePlaceholder eyebrow='Account' title='Your reviews' description='Customer review history will render here.'>
      <ProtectedActionRecoveryNotice result={recovery} />
    </RoutePlaceholder>
  );
}
