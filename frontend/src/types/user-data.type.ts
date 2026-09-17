import type { PlaceMemberRole, PlatformRole } from './enums/user-role.enum';
import type { Permission } from './permission.type';

export type PlaceMembership = {
  placeId: string;
  role: PlaceMemberRole;
  permissions: Permission[];
  effectivePermissions: Permission[];
};

export type AuthenticatedUser = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
  permissions: Permission[];
  placeMemberships: PlaceMembership[];
  createdAt: string;
  updatedAt: string;
};

export type UserData = AuthenticatedUser;
