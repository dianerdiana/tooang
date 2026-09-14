import type { PlatformRoleType } from './user-role.type';

export interface AccessTokenPayload {
  userId: string;
}

export interface AuthenticatedUser {
  id: string;
  userId: string;
  platformRole: PlatformRoleType;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  familyId: string;
}
