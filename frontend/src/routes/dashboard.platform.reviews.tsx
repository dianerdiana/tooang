import { createFileRoute } from '@tanstack/react-router';

import { DashboardPlaceholderPage } from '@/components/layouts/dashboard-placeholder-page';

import { dashboardRoutePermissions } from '@/configs/dashboard-navigation';

import { requirePlatformDashboardRoute } from '@/utils/auth/dashboard-route-access';

export const Route = createFileRoute('/dashboard/platform/reviews')({
  beforeLoad: ({ context }) =>
    requirePlatformDashboardRoute(context.auth.user, dashboardRoutePermissions.platform.reviews),
  head: () => ({ meta: [{ title: 'Review Moderation | Tooang' }] }),
  component: PlatformReviewsRoute,
});

function PlatformReviewsRoute() {
  return (
    <DashboardPlaceholderPage
      title='Reviews'
      description='Moderate reviews across the Tooang platform.'
      search={Route.useSearch()}
      scopeLabel='Platform'
    />
  );
}
