import type { ApiPaginationMeta } from '@/types/api-response.type';
import type { PlatformRole } from '@/types/enums/user-role.enum';

export const USER_SORT_BY = {
  CREATED_AT: 'createdAt',
  FULL_NAME: 'fullName',
  EMAIL: 'email',
} as const;

export const USER_SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type UserSortBy = (typeof USER_SORT_BY)[keyof typeof USER_SORT_BY];
export type UserSortOrder = (typeof USER_SORT_ORDER)[keyof typeof USER_SORT_ORDER];

export type UserSummary = {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
  createdAt: string;
  updatedAt: string;
};

export type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  platformRole?: PlatformRole;
  sortBy?: UserSortBy;
  sortOrder?: UserSortOrder;
};

export type NormalizedUserListParams = {
  page: number;
  limit: number;
  search?: string;
  platformRole?: PlatformRole;
  sortBy: UserSortBy;
  sortOrder: UserSortOrder;
};

export type UserListResult = {
  users: UserSummary[];
  meta: ApiPaginationMeta;
};

export type UserDeactivationResult = {
  userId: string;
  deletedAt: string;
};

export type PlatformRoleUpdateInput = {
  platformRole: PlatformRole;
};
