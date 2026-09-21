import type { AuthenticatedUser } from '@/types/user-data.type';

import type { MeUserResponse } from '../types/auth.response';

export const toAuthenticatedUser = (user: MeUserResponse): AuthenticatedUser => ({
  userId: user.userId,
  fullName: user.fullName,
  email: user.email,
  platformRole: user.platformRole,
  permissions: [...user.permissions],
  placeMemberships: user.placeMemberships.map((membership) => ({
    placeId: membership.placeId,
    role: membership.role,
    permissions: [...membership.permissions],
    effectivePermissions: [...membership.effectivePermissions],
  })),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
