import z from 'zod';

export const loginSchema = z.object({
  email: z.email('invalid email').max(254),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'full name is required').max(100),
  email: z.email('invalid email').max(254),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
