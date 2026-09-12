import { PlatformRoleEnum } from './user-role.type';

export interface AccessTokenPayload {
  userId: string;
}

export interface AuthenticatedUser {
  id: string;
  userId: string;
  platformRole: PlatformRoleEnum;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  familyId: string;
}
