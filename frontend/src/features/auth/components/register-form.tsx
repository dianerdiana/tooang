import { useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { Link, useRouter } from '@tanstack/react-router';
import { Loader2Icon, UserPlusIcon } from 'lucide-react';
import z from 'zod';

import { TooangWordmark } from '@/components/branding/tooang-wordmark';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { Input } from '@/components/ui/input';

import { isApplicationError } from '@/utils/api-error.util';
import { buildAuthEntrySearch } from '@/utils/auth/auth-entry-search';

import { useRegisterMutation } from '../queries/auth.mutations';
import { type RegisterFormDto, registerFormSchema, registerSchema } from '../schemas/auth.schema';
import { getRegisterErrorPresentation } from '../utils/auth-error';

import { PasswordInput } from './password-input';

type RegisterFormProps = {
  intentId?: string;
  redirectTo?: string;
};

type RegisterField = keyof RegisterFormDto;
type FieldErrors = Partial<Record<RegisterField, string>>;
type ValidationIssue = { field: RegisterField; message: string };

const firstError = (errors: unknown[]) => {
  const error = errors[0];
  return typeof error === 'string'
    ? error
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;
};

const focusAfterRender = (callback: () => void) => {
  window.requestAnimationFrame(callback);
};

const getValidationIssues = (values: RegisterFormDto): ValidationIssue[] => {
  const result = registerFormSchema.safeParse(values);
  if (result.success) return [];

  const seen = new Set<string>();
  return result.error.issues.flatMap((issue) => {
    const field = issue.path[0];
    if (
      typeof field !== 'string' ||
      !['fullName', 'email', 'password', 'confirmPassword'].includes(field) ||
      seen.has(field)
    ) {
      return [];
    }
    seen.add(field);
    return [{ field: field as RegisterField, message: issue.message }];
  });
};

export function RegisterForm({ intentId, redirectTo = '/' }: RegisterFormProps) {
  const router = useRouter();
  const mutation = useRegisterMutation();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [submissionError, setSubmissionError] = useState<string>();
  const form = useForm({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    validators: { onSubmit: registerFormSchema },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setValidationIssues([]);
      setSubmissionError(undefined);

      const parsed = registerFormSchema.parse(value);
      try {
        await mutation.mutateAsync(registerSchema.parse(parsed));
        await router.navigate({
          to: '/login',
          search: buildAuthEntrySearch({ intent: intentId, redirect: redirectTo, registered: true }),
          replace: true,
        });
      } catch (error) {
        const presentation = isApplicationError(error)
          ? getRegisterErrorPresentation(error)
          : { message: 'Unable to create your account. Please try again.' };
        setSubmissionError(presentation.message);
        if (presentation.field) {
          setFieldErrors({ [presentation.field]: presentation.message });
          focusAfterRender(() => document.getElementById(`register-${presentation.field}`)?.focus());
        } else {
          focusAfterRender(() => summaryRef.current?.focus());
        }
      }
    },
  });

  const displayedFieldError = (name: RegisterField, errors: unknown[], touched: boolean) =>
    fieldErrors[name] ?? (touched ? firstError(errors) : undefined);

  const clearFieldError = (name: RegisterField) => {
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setValidationIssues([]);
    setSubmissionError(undefined);
  };

  const flowSearch = buildAuthEntrySearch({ intent: intentId, redirect: redirectTo });

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
        <h1 className='text-xl font-semibold tracking-tight'>Create your account</h1>
        <CardDescription>Register to manage your orders, reviews, and profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className='grid gap-5'
          noValidate
          aria-busy={mutation.isPending || undefined}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (mutation.isPending || form.state.isSubmitting) return;

            const issues = getValidationIssues(form.state.values);
            if (issues.length > 0) {
              setValidationIssues(issues);
              setFieldErrors(Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
              setSubmissionError(undefined);
              void form.handleSubmit();
              focusAfterRender(() => document.getElementById(`register-${issues[0].field}`)?.focus());
              return;
            }

            void form.handleSubmit();
          }}
        >
          {(validationIssues.length > 0 || submissionError) && (
            <CustomerAlert
              ref={summaryRef}
              tabIndex={-1}
              tone='error'
              title={validationIssues.length > 0 ? 'Check your details' : 'We could not create your account'}
              description={
                validationIssues.length > 0 ? (
                  <ul className='list-disc space-y-1 pl-5'>
                    {validationIssues.map((issue) => (
                      <li key={issue.field}>
                        <a className='underline underline-offset-2' href={`#register-${issue.field}`}>
                          {issue.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  submissionError
                )
              }
              live
            />
          )}

          <form.Field name='fullName' validators={{ onBlur: registerSchema.shape.fullName }}>
            {(field) => (
              <FormField
                id='register-fullName'
                error={displayedFieldError('fullName', field.state.meta.errors, field.state.meta.isTouched)}
              >
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    autoComplete='name'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearFieldError('fullName');
                      field.handleChange(event.target.value);
                    }}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='email' validators={{ onBlur: registerSchema.shape.email }}>
            {(field) => (
              <FormField
                id='register-email'
                error={displayedFieldError('email', field.state.meta.errors, field.state.meta.isTouched)}
              >
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    type='email'
                    inputMode='email'
                    autoComplete='email'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearFieldError('email');
                      field.handleChange(event.target.value);
                    }}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='password' validators={{ onBlur: registerSchema.shape.password }}>
            {(field) => (
              <FormField
                id='register-password'
                error={displayedFieldError('password', field.state.meta.errors, field.state.meta.isTouched)}
              >
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    name={field.name}
                    autoComplete='new-password'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearFieldError('password');
                      field.handleChange(event.target.value);
                    }}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormDescription>Use 8–128 characters. Avoid common passwords.</FormDescription>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Field name='confirmPassword' validators={{ onBlur: z.string().min(1, 'Confirm your password') }}>
            {(field) => (
              <FormField
                id='register-confirmPassword'
                error={displayedFieldError('confirmPassword', field.state.meta.errors, field.state.meta.isTouched)}
              >
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <PasswordInput
                    name={field.name}
                    autoComplete='new-password'
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      clearFieldError('confirmPassword');
                      field.handleChange(event.target.value);
                    }}
                    disabled={mutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormField>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type='submit' size='lg' disabled={!canSubmit || isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? (
                  <>
                    <Loader2Icon className='animate-spin' aria-hidden /> Creating account…
                  </>
                ) : (
                  <>
                    <UserPlusIcon aria-hidden /> Create account
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
          <p className='text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <Link
              to='/login'
              search={flowSearch}
              className='inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline'
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
