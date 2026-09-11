import { UserRoleEnum } from './user-role.type';

export interface UserTokenPayload {
  userId: string;
  roles: UserRoleEnum[];
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  familyId: string;
}
