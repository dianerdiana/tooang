import { createFileRoute } from '@tanstack/react-router';

import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';
import { CustomerReviewsPage } from '@/features/reviews/components/customer-reviews-page';
import { parseOwnReviewSearch } from '@/features/reviews/schemas/reviews.schema';

export const Route = createFileRoute('/_customer/account/reviews')({
  validateSearch: parseOwnReviewSearch,
  head: () => ({ meta: [{ title: 'Your reviews | Tooang' }] }),
  component: ReviewsRoute,
});

function ReviewsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const recovery = useProtectedActionRecovery({ currentUrl: '/account/reviews' });

  return (
    <CustomerReviewsPage
      search={search}
      onSearchChange={(next) => void navigate({ search: next })}
      recoveryNotice={<ProtectedActionRecoveryNotice result={recovery} />}
    />
  );
}
