import { useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Link, useRouter } from '@tanstack/react-router';
import { Loader2Icon, LogInIcon } from 'lucide-react';

import { TooangWordmark } from '@/components/branding/tooang-wordmark';
import { FormControl, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { Input } from '@/components/ui/input';

import { isApplicationError } from '@/utils/api-error.util';
import { buildAuthEntrySearch } from '@/utils/auth/auth-entry-search';
import { getProtectedActionReturnTarget } from '@/utils/auth/protected-action-intent';

import { useLoginMutation } from '../queries/auth.mutations';
import { loginFormSchema, loginSchema } from '../schemas/auth.schema';
import { getLoginErrorMessage } from '../utils/auth-error';

import { PasswordInput } from './password-input';

type LoginFormProps = {
  intentId?: string;
  redirectTo?: string;
  registrationComplete?: boolean;
};

const firstErrorMessage = (errors: unknown[]) => {
  const error = errors[0];
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return undefined;
};

const focusAfterRender = (callback: () => void) => {
  window.requestAnimationFrame(callback);
};

export function LoginForm({ intentId, redirectTo = '/', registrationComplete = false }: LoginFormProps) {
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const formElementRef = useRef<HTMLFormElement>(null);
  const submissionErrorRef = useRef<HTMLDivElement>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validators: { onSubmit: loginFormSchema },
    onSubmit: async ({ value }) => {
      setSubmissionError(undefined);
      try {
        await loginMutation.mutateAsync(loginSchema.parse(value));
        await router.navigate({ href: getProtectedActionReturnTarget(intentId, redirectTo), replace: true });
      } catch (error) {
        setSubmissionError(
          isApplicationError(error) ? getLoginErrorMessage(error) : 'Unable to sign in. Please try again.',
        );
        focusAfterRender(() => submissionErrorRef.current?.focus());
      }
    },
  });

  return (
    <Card className='w-full shadow-md'>
      <CardHeader className='items-center text-center'>
        <Link
          to='/'
          aria-label='Tooang home'
          className='mb-3 rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
        >
          <TooangWordmark size='auth' />
        </Link>
        <h1 className='text-xl font-semibold tracking-tight'>Welcome back</h1>
        <CardDescription>Sign in to continue to your Tooang account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          ref={formElementRef}
          className='grid gap-5'
          noValidate
          aria-busy={loginMutation.isPending || undefined}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (loginMutation.isPending || form.state.isSubmitting) return;

            const valid = loginFormSchema.safeParse(form.state.values).success;
            void form.handleSubmit().then(() => {
              if (!valid) {
                focusAfterRender(() =>
                  formElementRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
                );
              }
            });
          }}
        >
          {registrationComplete && (
            <CustomerAlert
              tone='success'
              title='Your account is ready'
              description='Sign in with your new credentials to continue.'
              live
            />
          )}

          <form.Field name='email' validators={{ onBlur: loginFormSchema.shape.email }}>
            {(field) => (
              <FormField
                id='login-email'
                error={field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined}
              >
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
                    onChange={(event) => {
                      setSubmissionError(undefined);
                      field.handleChange(event.target.value);
                    }}
                    disabled={loginMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='password' validators={{ onBlur: loginFormSchema.shape.password }}>
            {(field) => (
              <FormField
                id='login-password'
                error={field.state.meta.isTouched ? firstErrorMessage(field.state.meta.errors) : undefined}
              >
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    name={field.name}
                    autoComplete='current-password'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      setSubmissionError(undefined);
                      field.handleChange(event.target.value);
                    }}
                    disabled={loginMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='rememberMe'>
            {(field) => (
              <label className='flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground'>
                <input
                  type='checkbox'
                  name={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  disabled={loginMutation.isPending}
                  className='size-5 rounded border-input accent-primary'
                />
                Keep me signed in
              </label>
            )}
          </form.Field>

          {submissionError && (
            <CustomerAlert
              ref={submissionErrorRef}
              tabIndex={-1}
              tone='error'
              title='We could not sign you in'
              description={submissionError}
              live
            />
          )}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type='submit' size='lg' disabled={!canSubmit || isSubmitting || loginMutation.isPending}>
                {isSubmitting || loginMutation.isPending ? (
                  <>
                    <Loader2Icon className='animate-spin' aria-hidden /> Signing in…
                  </>
                ) : (
                  <>
                    <LogInIcon aria-hidden /> Sign in
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
          <p className='text-center text-sm text-muted-foreground'>
            New to Tooang?{' '}
            <Link
              to='/register'
              search={buildAuthEntrySearch({ intent: intentId, redirect: redirectTo })}
              className='inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline'
            >
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
