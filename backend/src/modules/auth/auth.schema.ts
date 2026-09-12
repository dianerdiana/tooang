import { z } from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;

const fullName = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => unicodeLength(value) >= 1, 'Must contain at least 1 character')
  .refine((value) => unicodeLength(value) <= 100, 'Must contain at most 100 characters');

const email = z.string().trim().toLowerCase().email().max(254);

const password = z
  .string()
  .refine((value) => unicodeLength(value) >= 8, 'Must contain at least 8 characters')
  .refine((value) => unicodeLength(value) <= 128, 'Must contain at most 128 characters');

export const registerSchema = z
  .object({
    fullName,
    email,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password,
    rememberMe: z.boolean().default(false),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
