import { createFileRoute, redirect } from '@tanstack/react-router';

import { getDashboardAccessRedirect } from '@/utils/auth/dashboard-access';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context, location }) => {
    const accessRedirect = getDashboardAccessRedirect(context.auth, location.href);
    if (accessRedirect) throw redirect(accessRedirect);
  },
});
