import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { MyReviewsPage } from '@/features/reviews/components/my-reviews-page';
import { parseOwnReviewSearch } from '@/features/reviews/schemas/reviews.schema';

import { requireAccountDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/account/reviews')({
  validateSearch: parseOwnReviewSearch,
  beforeLoad: ({ context }) => requireAccountDashboardRoute(context.auth.user, [PERMISSION.PROFILE_READ]),
  head: () => ({ meta: [{ title: 'My Reviews | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <MyReviewsPage search={search} onSearchChange={(next) => void navigate({ search: next })} />;
}
