import z from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  password: z.string().min(1, 'Enter your password').max(128, 'Password must be at most 128 characters'),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name').max(100, 'Full name must be at most 100 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirm your password') })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginDto = z.input<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type RegisterFormDto = z.input<typeof registerFormSchema>;
