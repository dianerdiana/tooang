import type { PlaceMemberRole, PlatformRole } from './enums/user-role.enum';
import type { EffectivePermissions, PermissionIdentifier } from './permission.type';

export type PlaceMembership = {
  placeId: string;
  role: PlaceMemberRole;
  permissions: PermissionIdentifier[];
  effectivePermissions: EffectivePermissions;
};

export type AuthenticatedUser = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
  permissions: PermissionIdentifier[];
  placeMemberships: PlaceMembership[];
  createdAt: string;
  updatedAt: string;
};

export type UserData = AuthenticatedUser;
