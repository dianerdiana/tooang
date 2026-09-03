import z from 'zod';

export const loginSchema = z.object({
  email: z.email('invalid email').max(255),
  password: z.string().min(1, 'password is required').min(8, 'password must be at least 8 characters').max(128),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  email: z.email('invalid email').max(255),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
