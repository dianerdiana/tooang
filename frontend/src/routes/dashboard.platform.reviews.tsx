import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { ReviewModerationPage } from '@/features/reviews/components/review-moderation-page';
import { parseReviewModerationSearch } from '@/features/reviews/schemas/reviews.schema';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/reviews')({
  validateSearch: parseReviewModerationSearch,
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.reviews),
  head: () => ({ meta: [{ title: 'Review Moderation | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: PlatformReviewsRoute,
});

function PlatformReviewsRoute() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ReviewModerationPage filters={filters} onFiltersChange={(nextFilters) => void navigate({ search: nextFilters })} />
  );
}
