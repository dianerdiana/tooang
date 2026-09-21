import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import { Loader2Icon, LogInIcon } from 'lucide-react';

import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { isApplicationError } from '@/utils/api-error.util';

import { useLoginMutation } from '../queries/auth.mutations';
import { loginSchema } from '../schemas/auth.schema';
import { getLoginErrorMessage } from '../utils/auth-error';

type LoginFormProps = {
  redirectTo: string;
};

const firstErrorMessage = (errors: unknown[]) => {
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    onSubmit: async ({ value }) => {
      setSubmissionError(undefined);
      try {
        await loginMutation.mutateAsync(loginSchema.parse(value));
        await router.navigate({ href: redirectTo, replace: true });
      } catch (error) {
        const normalizedError = loginMutation.error ?? error;
        if (isApplicationError(normalizedError)) {
          setSubmissionError(getLoginErrorMessage(normalizedError));
          return;
        }
        setSubmissionError('Unable to sign in. Please try again.');
      }
    },
  });

  return (
    <Card className='w-full max-w-md shadow-md'>
      <CardHeader className='items-center text-center'>
        <img src='/assets/logo/logo-brand-name.png' alt='Tooang' className='mb-3 h-10 w-auto object-contain' />
        <CardTitle className='text-xl'>Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your Tooang account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='grid gap-5'
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name='email' validators={{ onBlur: loginSchema.shape.email }}>
            {(field) => (
              <FormField error={field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined}>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    type='email'
                    autoComplete='email'
                    inputMode='email'
                    placeholder='you@example.com'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    disabled={loginMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='password' validators={{ onBlur: loginSchema.shape.password }}>
            {(field) => (
              <FormField error={field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined}>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    type='password'
                    autoComplete='current-password'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    disabled={loginMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='rememberMe'>
            {(field) => (
              <label className='flex cursor-pointer items-center gap-2 text-sm text-muted-foreground'>
                <input
                  type='checkbox'
                  name={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  disabled={loginMutation.isPending}
                  className='size-4 rounded border-input accent-primary'
                />
                Keep me signed in
              </label>
            )}
          </form.Field>

          {submissionError && (
            <div role='alert' className='rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive'>
              {submissionError}
            </div>
          )}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type='submit' size='lg' disabled={!canSubmit || isSubmitting || loginMutation.isPending}>
                {isSubmitting || loginMutation.isPending ? (
                  <>
                    <Loader2Icon className='animate-spin' /> Signing in…
                  </>
                ) : (
                  <>
                    <LogInIcon /> Sign in
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
