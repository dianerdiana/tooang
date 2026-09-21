import z from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  password: z.string().min(1, 'Enter your password').max(128, 'Password must be at most 128 characters'),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'full name is required').max(100),
  email: z.email('invalid email').max(254),
  password: z.string().min(8, 'password must be at least 8 characters').max(128),
});

export type LoginDto = z.input<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
