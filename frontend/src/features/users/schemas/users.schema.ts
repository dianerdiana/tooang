import { z } from 'zod';

import { PlatformRole } from '@/types/enums/user-role.enum';

import { type NormalizedUserListParams, USER_SORT_BY, USER_SORT_ORDER, type UserListParams } from '../types/users.type';

export const DEFAULT_USERS_PAGE = 1;
export const DEFAULT_USERS_LIMIT = 20;

const positiveInteger = (fallback: number, maximum?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
      return fallback;
    },
    maximum ? z.number().int().min(1).max(maximum).catch(fallback) : z.number().int().min(1).catch(fallback),
  );

const optionalSearch = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
  z.string().max(100).optional(),
);

export const usersSearchSchema = z
  .object({
    page: positiveInteger(DEFAULT_USERS_PAGE),
    limit: positiveInteger(DEFAULT_USERS_LIMIT, 100),
    search: optionalSearch,
    platformRole: z.enum(PlatformRole).optional().catch(undefined),
    sortBy: z.enum(USER_SORT_BY).default(USER_SORT_BY.CREATED_AT).catch(USER_SORT_BY.CREATED_AT),
    sortOrder: z.enum(USER_SORT_ORDER).default(USER_SORT_ORDER.DESC).catch(USER_SORT_ORDER.DESC),
  })
  .strip();

export const parseUsersSearch = (search: Record<string, unknown>): NormalizedUserListParams =>
  usersSearchSchema.parse(search) as NormalizedUserListParams;

export const normalizeUserListParams = (params: UserListParams): NormalizedUserListParams => {
  const parsed = usersSearchSchema.parse(params) as NormalizedUserListParams;
  return {
    page: parsed.page,
    limit: parsed.limit,
    ...(parsed.search ? { search: parsed.search } : {}),
    ...(parsed.platformRole ? { platformRole: parsed.platformRole } : {}),
    sortBy: parsed.sortBy,
    sortOrder: parsed.sortOrder,
  };
};

export const platformRoleUpdateSchema = z.object({ platformRole: z.enum(PlatformRole) }).strict();

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(100),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    platformRole: z.enum(PlatformRole),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(100),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  })
  .strict();
