import { UserRoleEnum } from './user-role.type';

export interface UserTokenPayload {
  userId: string;
  fullName: string;
  email: string;
  role: UserRoleEnum;
}
