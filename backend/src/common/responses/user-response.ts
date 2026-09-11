import { UserRoleEnum } from '../auth';

type UserRecord = {
  userId: string;
  fullName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  roles: Array<{ role: { code: string } }>;
};

export type SafeUserResponse = {
  userId: string;
  fullName: string;
  email: string;
  roles: UserRoleEnum[];
  createdAt: string;
  updatedAt: string;
};

export function toSafeUserResponse(user: UserRecord): SafeUserResponse {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map(({ role }) => role.code as UserRoleEnum),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
