import type { PlatformRoleType } from '../auth';

type UserRecord = {
  userId: string;
  fullName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  platformRole: PlatformRoleType;
};

export type SafeUserResponse = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRoleType;
  createdAt: string;
  updatedAt: string;
};

export function toSafeUserResponse(user: UserRecord): SafeUserResponse {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    platformRole: user.platformRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
