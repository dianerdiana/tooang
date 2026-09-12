import { PlatformRoleEnum } from '../auth';

type UserRecord = {
  userId: string;
  fullName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  platformRole: string;
};

export type SafeUserResponse = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRoleEnum;
  createdAt: string;
  updatedAt: string;
};

export function toSafeUserResponse(user: UserRecord): SafeUserResponse {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    platformRole: user.platformRole as PlatformRoleEnum,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
