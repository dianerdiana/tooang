import { z } from 'zod';

import { PlatformRole } from '@/generated/prisma/client';

import { paginationFields } from '@/common/schemas';

const unicodeLength = (value: string) => Array.from(value).length;

const fullName = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => unicodeLength(value) >= 1, 'Must contain at least 1 character')
  .refine((value) => unicodeLength(value) <= 100, 'Must contain at most 100 characters');

export const updateMeSchema = z
  .object({
    fullName: fullName.optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
  })
  .strict()
  .refine((value) => value.fullName !== undefined || value.email !== undefined, {
    message: 'At least one supported field is required',
  });

export const userIdParamSchema = z.object({ userId: z.string().min(1).max(100) }).strict();

export const listUsersSchema = z
  .object({
    ...paginationFields,
    search: z.string().trim().max(100).optional(),
    platformRole: z.enum(PlatformRole).optional(),
    sortBy: z.enum(['createdAt', 'fullName', 'email']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const platformRoleSchema = z.object({ platformRole: z.enum(PlatformRole) }).strict();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type PlatformRoleInput = z.infer<typeof platformRoleSchema>;
