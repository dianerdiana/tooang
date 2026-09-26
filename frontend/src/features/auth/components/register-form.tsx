import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Link, useRouter } from '@tanstack/react-router';
import { Loader2Icon, UserPlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { isApplicationError } from '@/utils/api-error.util';

import { useRegisterMutation } from '../queries/auth.mutations';
import { registerFormSchema, registerSchema } from '../schemas/auth.schema';

const firstError = (errors: unknown[]) => {
  const error = errors[0];
  return typeof error === 'string'
    ? error
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;
};

export function RegisterForm() {
  const router = useRouter();
  const mutation = useRegisterMutation();
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setSubmissionError(undefined);
      const parsed = registerFormSchema.safeParse(value);
      if (!parsed.success) {
        setSubmissionError(parsed.error.issues[0]?.message ?? 'Check your registration details.');
        return;
      }
      try {
        await mutation.mutateAsync(registerSchema.parse(parsed.data));
        toast.success('Account created. Sign in with your new credentials.');
        await router.navigate({ to: '/login', replace: true });
      } catch (error) {
        const normalized = mutation.error ?? error;
        setSubmissionError(
          isApplicationError(normalized)
            ? normalized.httpStatus === 409
              ? 'An account with this email already exists.'
              : normalized.message
            : 'Unable to create your account. Please try again.',
        );
      }
    },
  });

  return (
    <Card className='w-full max-w-md shadow-md'>
      <CardHeader className='items-center text-center'>
        <img src='/assets/logo/logo-brand-name.png' alt='Tooang' className='mb-3 h-10 w-auto object-contain' />
        <CardTitle className='text-xl'>Create your account</CardTitle>
        <CardDescription>Register to manage your orders, reviews, and profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='grid gap-4'
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          {(
            [
              ['fullName', 'Full name', 'text', 'name'],
              ['email', 'Email', 'email', 'email'],
              ['password', 'Password', 'password', 'new-password'],
              ['confirmPassword', 'Confirm password', 'password', 'new-password'],
            ] as const
          ).map(([name, label, type, autoComplete]) => (
            <form.Field key={name} name={name}>
              {(field) => (
                <FormField error={field.state.meta.isTouched ? firstError(field.state.meta.errors) : undefined}>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input
                      name={field.name}
                      type={type}
                      autoComplete={autoComplete}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
              )}
            </form.Field>
          ))}
          {submissionError && (
            <div role='alert' className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              {submissionError}
            </div>
          )}
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type='submit' size='lg' disabled={!canSubmit || isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? (
                  <>
                    <Loader2Icon className='animate-spin' /> Creating account…
                  </>
                ) : (
                  <>
                    <UserPlusIcon /> Create account
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
          <p className='text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <Link to='/login' className='font-medium text-primary underline-offset-4 hover:underline'>
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
