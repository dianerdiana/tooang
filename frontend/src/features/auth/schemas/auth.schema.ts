import z from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;

const exactPasswordSchema = z
  .string()
  .refine((value) => unicodeLength(value) >= 1, 'Enter your password')
  .refine((value) => unicodeLength(value) <= 128, 'Password must be at most 128 characters');

const registrationPasswordSchema = z
  .string()
  .refine((value) => unicodeLength(value) >= 8, 'Password must be at least 8 characters')
  .refine((value) => unicodeLength(value) <= 128, 'Password must be at most 128 characters');

export const loginFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  password: exactPasswordSchema,
  rememberMe: z.boolean(),
});

export const loginSchema = loginFormSchema.extend({ rememberMe: z.boolean().default(false) });

export const registerSchema = z.object({
  fullName: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => unicodeLength(value) >= 1, 'Enter your full name')
    .refine((value) => unicodeLength(value) <= 100, 'Full name must be at most 100 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  password: registrationPasswordSchema,
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
