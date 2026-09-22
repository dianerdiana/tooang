import type { AuthenticatedUser } from '@/types/user-data.type';

import { getSafeRedirectTarget } from './route-guard';

export type DashboardAuthState = {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
};

export type DashboardAccessRedirect =
  | {
      to: '/login';
      search: { redirect: string };
      replace: true;
    }
  | {
      to: '/';
      replace: true;
    };

/** UI routing policy only; backend authorization remains authoritative. */
export const canAccessDashboard = (user: AuthenticatedUser | null) =>
  user !== null &&
  (user.globalPermissions.length > 0 ||
    user.placeMemberships.some((membership) => membership.effectivePermissions.length > 0));

export const getDashboardAccessRedirect = (
  auth: DashboardAuthState,
  requestedPath: string,
): DashboardAccessRedirect | null => {
  if (!auth.isAuthenticated || !auth.user) {
    return {
      to: '/login',
      search: { redirect: getSafeRedirectTarget(requestedPath) },
      replace: true,
    };
  }

  if (!canAccessDashboard(auth.user)) {
    return { to: '/', replace: true };
  }

  return null;
};
