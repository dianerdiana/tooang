import type { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import type { EffectivePermissions, PermissionIdentifier } from '@/types/permission.type';

export type AuthUserSummary = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
};

export type RegisteredUser = AuthUserSummary & {
  createdAt: string;
  updatedAt: string;
};

export type RegisterResponse = { user: RegisteredUser };

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUserSummary;
};

export type RefreshResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type MePlaceMembershipResponse = {
  placeId: string;
  role: PlaceMemberRole;
  permissions: PermissionIdentifier[];
  effectivePermissions: EffectivePermissions;
};

export type MeUserResponse = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
  permissions: PermissionIdentifier[];
  placeMemberships: MePlaceMembershipResponse[];
  createdAt: string;
  updatedAt: string;
};

export type MeResponse = { user: MeUserResponse };
