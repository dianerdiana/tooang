import { z } from 'zod';

import { UserRoleEnum } from '@/common/auth';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const userIdSchema = z.string().trim().min(1).max(100);

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: emailSchema.optional(),
  })
  .strict()
  .refine((value) => value.fullName !== undefined || value.email !== undefined, {
    message: 'At least one editable field is required',
  });

export const listUsersSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().min(1).max(100).optional(),
    column: z.enum(['createdAt', 'fullName', 'email']).default('createdAt'),
    sort: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export const userIdParamsSchema = z.object({ userId: userIdSchema }).strict();
export const assignRoleSchema = z.object({ role: z.nativeEnum(UserRoleEnum) }).strict();
export const revokeRoleParamsSchema = z
  .object({ userId: userIdSchema, role: z.nativeEnum(UserRoleEnum) })
  .strict();

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type RevokeRoleParams = z.infer<typeof revokeRoleParamsSchema>;
