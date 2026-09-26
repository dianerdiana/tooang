import { createFileRoute } from '@tanstack/react-router';

import { DashboardRouteError } from '@/components/layouts/dashboard-route-error';

import { ProfilePage } from '@/features/users/components/profile-page';

import { requireAccountDashboardRoute } from '@/utils/auth/dashboard-route-access';

import { PERMISSION } from '@/types/permission.type';

export const Route = createFileRoute('/dashboard/account/profile')({
  beforeLoad: ({ context }) => requireAccountDashboardRoute(context.auth.user, [PERMISSION.PROFILE_READ]),
  head: () => ({ meta: [{ title: 'Profile | Tooang' }] }),
  errorComponent: DashboardRouteError,
  component: ProfilePage,
});
