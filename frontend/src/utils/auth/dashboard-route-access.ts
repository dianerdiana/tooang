import { redirect } from '@tanstack/react-router';

import type { PermissionIdentifier } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

export type DashboardRouteScope = 'place' | 'platform';

export const hasAnyPermission = (
  grantedPermissions: readonly PermissionIdentifier[],
  requiredPermissions: readonly PermissionIdentifier[],
) => requiredPermissions.some((permission) => grantedPermissions.includes(permission));

export const canAccessPlaceDashboardRoute = (
  membership: PlaceMembership | null,
  requiredPermissions: readonly PermissionIdentifier[],
) => membership !== null && hasAnyPermission(membership.effectivePermissions, requiredPermissions);

export const canAccessPlatformDashboardRoute = (
  user: AuthenticatedUser,
  requiredPermissions: readonly PermissionIdentifier[],
) => hasAnyPermission(user.globalPermissions, requiredPermissions);

export const requirePlaceDashboardRoute = (
  membership: PlaceMembership | null,
  requiredPermissions: readonly PermissionIdentifier[],
) => {
  if (!canAccessPlaceDashboardRoute(membership, requiredPermissions)) {
    throw redirect({ to: '/not-found', replace: true });
  }
};

export const requirePlatformDashboardRoute = (
  user: AuthenticatedUser | null,
  requiredPermissions: readonly PermissionIdentifier[],
) => {
  if (!user || !canAccessPlatformDashboardRoute(user, requiredPermissions)) {
    throw redirect({ to: '/not-found', replace: true });
  }
};

export const requireAccountDashboardRoute = (
  user: AuthenticatedUser | null,
  requiredPermissions: readonly PermissionIdentifier[],
) => {
  if (!user || !hasAnyPermission(user.permissions, requiredPermissions)) {
    throw redirect({ to: '/not-found', replace: true });
  }
};
