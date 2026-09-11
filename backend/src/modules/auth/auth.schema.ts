import { z } from 'zod';

const emailSchema = z.email().trim().toLowerCase().max(254);
const tokenSchema = z.string().trim().min(1).max(4096);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z
      .string()
      .min(8)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
        message: 'Password must not exceed 72 UTF-8 bytes',
      }),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(1024),
  })
  .strict();

export const refreshSchema = z.object({ refreshToken: tokenSchema }).strict();
export const logoutSchema = refreshSchema;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
