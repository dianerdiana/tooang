import type { PlatformRole } from '@/types/enums/user-role.enum';
import type { AuthenticatedUser } from '@/types/user-data.type';

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

export type ProfileResponse = { user: AuthenticatedUser };
