import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { DashboardShell } from '@/components/layouts/dashboard-shell';

import { baseDashboardNavigation } from '@/configs/dashboard-navigation';

import { getDashboardAccessRedirect } from '@/utils/auth/dashboard-access';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context, location }) => {
    const accessRedirect = getDashboardAccessRedirect(context.auth, location.href);
    if (accessRedirect) throw redirect(accessRedirect);
  },
  component: DashboardLayoutRoute,
});

function DashboardLayoutRoute() {
  return (
    <DashboardShell navigation={baseDashboardNavigation}>
      <Outlet />
    </DashboardShell>
  );
}
