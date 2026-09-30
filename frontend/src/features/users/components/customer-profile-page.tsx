import { useEffect, useRef, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboardIcon,
  Loader2Icon,
  LogOutIcon,
  type LucideIcon,
  MonitorIcon,
  MoonIcon,
  SaveIcon,
  ShoppingBagIcon,
  StarIcon,
  SunIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';

import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from '@/components/forms/form-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { CustomerAlert } from '@/components/ui/customer-alert';
import { Input } from '@/components/ui/input';
import { LiveRegion } from '@/components/ui/live-region';

import { useLogoutMutation } from '@/features/auth/queries/auth.mutations';
import { clearPrivateClientSession } from '@/features/auth/queries/auth-session.query';

import { isApplicationError } from '@/utils/api-error.util';
import { canAccessDashboard } from '@/utils/auth/dashboard-access';
import type { Theme } from '@/utils/context/theme-context';
import { getCustomerErrorPresentation } from '@/utils/customer-error-presentation';
import { useAuth } from '@/utils/hooks/use-auth';
import { useTheme } from '@/utils/hooks/use-theme';
import { cn } from '@/utils/utils';

import { PERMISSION } from '@/types/permission.type';

import { useAccountDeletionRequestMutation, useUpdateProfileMutation } from '../queries/users.mutation';
import { updateProfileSchema } from '../schemas/users.schema';
import type { UpdateProfileInput } from '../types/users.type';

type ProfileField = keyof UpdateProfileInput;
type FieldErrors = Partial<Record<ProfileField, string>>;
type ValidationIssue = { field: ProfileField; message: string };

const themeOptions: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

const firstError = (errors: unknown[]) => {
  const error = errors[0];
  return typeof error === 'string'
    ? error
    : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;
};

const profileValidationIssues = (values: UpdateProfileInput): ValidationIssue[] => {
  const parsed = updateProfileSchema.safeParse(values);
  if (parsed.success) return [];

  const seen = new Set<string>();
  return parsed.error.issues.flatMap((issue) => {
    const field = issue.path[0];
    if ((field !== 'fullName' && field !== 'email') || seen.has(field)) return [];
    seen.add(field);
    return [{ field, message: issue.message }];
  });
};

const formatAccountDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(value));

function ProfileForm() {
  const { user } = useAuth();
  const mutation = useUpdateProfileMutation();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [submissionError, setSubmissionError] = useState<{ title: string; description: string }>();
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<ProfileField | 'summary'>();
  const form = useForm({
    defaultValues: { fullName: user?.fullName ?? '', email: user?.email ?? '' },
    validators: { onSubmit: updateProfileSchema },
    onSubmit: async ({ value }) => {
      setFieldErrors({});
      setValidationIssues([]);
      setSubmissionError(undefined);
      const parsed = updateProfileSchema.parse(value);

      try {
        const updated = await mutation.mutateAsync(parsed);
        form.reset({ fullName: updated.fullName, email: updated.email });
        setAnnouncement('Profile updated successfully.');
        toast.success('Profile updated');
      } catch (error) {
        if (isApplicationError(error) && error.httpStatus === 409) {
          const message = 'That email address is already used by another account.';
          setFieldErrors({ email: message });
          setSubmissionError({ title: 'Email unavailable', description: message });
          setFocusTarget('email');
          return;
        }

        const presentation = getCustomerErrorPresentation(error);
        setSubmissionError({ title: presentation.title, description: presentation.description });
        setFocusTarget('summary');
      }
    },
  });

  useEffect(() => {
    if (!focusTarget) return;
    const frame = window.requestAnimationFrame(() => {
      if (focusTarget === 'summary') {
        summaryRef.current?.focus();
        return;
      }
      document.getElementById(`customer-profile-${focusTarget}`)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTarget, submissionError, validationIssues]);

  if (!user) return null;

  const canUpdate = user.permissions.includes(PERMISSION.PROFILE_UPDATE);

  const displayedError = (name: ProfileField, errors: unknown[], touched: boolean) =>
    fieldErrors[name] ?? (touched ? firstError(errors) : undefined);

  const clearError = (name: ProfileField) => {
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setValidationIssues([]);
    setSubmissionError(undefined);
    setFocusTarget(undefined);
  };

  if (!canUpdate) {
    return (
      <Card aria-labelledby='personal-information-title'>
        <CardHeader>
          <h2 id='personal-information-title' className='text-lg font-semibold'>
            Personal information
          </h2>
          <CardDescription>Your current account identity.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className='grid gap-5 sm:grid-cols-2'>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>Full name</dt>
              <dd className='mt-1 wrap-break-word'>{user.fullName}</dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>Email</dt>
              <dd className='mt-1 wrap-break-word'>{user.email}</dd>
            </div>
            <div>
              <dt className='text-sm font-medium text-muted-foreground'>Member since</dt>
              <dd className='mt-1'>{formatAccountDate(user.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card aria-labelledby='personal-information-title'>
      <LiveRegion>{announcement}</LiveRegion>
      <CardHeader>
        <h2 id='personal-information-title' className='text-lg font-semibold'>
          Personal information
        </h2>
        <CardDescription>Update the name and email attached to your account.</CardDescription>
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

            const issues = profileValidationIssues(form.state.values);
            if (issues.length > 0) {
              setValidationIssues(issues);
              setFieldErrors(Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
              setSubmissionError(undefined);
              setFocusTarget(issues[0].field);
              void form.handleSubmit();
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
              title={validationIssues.length > 0 ? 'Check your profile details' : (submissionError?.title ?? 'Error')}
              description={
                validationIssues.length > 0 ? (
                  <ul className='list-disc space-y-1 pl-5'>
                    {validationIssues.map((issue) => (
                      <li key={issue.field}>
                        <a href={`#customer-profile-${issue.field}`} className='underline underline-offset-2'>
                          {issue.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  submissionError?.description
                )
              }
              live
            />
          )}

          <div className='grid gap-5 sm:grid-cols-2'>
            <form.Field name='fullName' validators={{ onBlur: updateProfileSchema.shape.fullName }}>
              {(field) => (
                <FormField
                  id='customer-profile-fullName'
                  error={displayedError('fullName', field.state.meta.errors, field.state.meta.isTouched)}
                >
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      name={field.name}
                      autoComplete='name'
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        clearError('fullName');
                        field.handleChange(event.target.value);
                      }}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
              )}
            </form.Field>

            <form.Field name='email' validators={{ onBlur: updateProfileSchema.shape.email }}>
              {(field) => (
                <FormField
                  id='customer-profile-email'
                  error={displayedError('email', field.state.meta.errors, field.state.meta.isTouched)}
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
                        clearError('email');
                        field.handleChange(event.target.value);
                      }}
                      disabled={mutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>This address is used to sign in.</FormDescription>
                  <FormMessage />
                </FormField>
              )}
            </form.Field>
          </div>

          <p className='text-sm text-muted-foreground'>Member since {formatAccountDate(user.createdAt)}</p>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}>
            {([canSubmit, isSubmitting, isDirty]) => (
              <Button
                type='submit'
                className='w-full sm:w-fit'
                disabled={!canSubmit || !isDirty || isSubmitting || mutation.isPending}
              >
                {isSubmitting || mutation.isPending ? (
                  <>
                    <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden /> Saving…
                  </>
                ) : (
                  <>
                    <SaveIcon aria-hidden /> Save changes
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

function AccountNavigation() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const logout = useLogoutMutation();

  if (!user) return null;

  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      toast.error('You were signed out locally, but Tooang could not reach the server.');
    } finally {
      await router.navigate({ to: '/', replace: true });
    }
  };

  return (
    <Card aria-labelledby='account-navigation-title'>
      <CardHeader>
        <h2 id='account-navigation-title' className='text-lg font-semibold'>
          Account
        </h2>
        <CardDescription>Navigate your customer activity and display preferences.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <nav className='grid gap-2 sm:grid-cols-2' aria-label='Account destinations'>
          <Button variant='outline' className='justify-start' asChild>
            <Link to='/orders'>
              <ShoppingBagIcon aria-hidden /> My orders
            </Link>
          </Button>
          <Button variant='outline' className='justify-start' asChild>
            <Link to='/account/reviews' search={{ tab: 'place', page: 1, limit: 20 }}>
              <StarIcon aria-hidden /> My reviews
            </Link>
          </Button>
          {canAccessDashboard(user) && (
            <Button variant='outline' className='justify-start sm:col-span-2' asChild>
              <Link to='/dashboard' search={{}}>
                <LayoutDashboardIcon aria-hidden /> Open dashboard
              </Link>
            </Button>
          )}
        </nav>

        <fieldset>
          <legend className='text-sm font-semibold'>Theme</legend>
          <p className='mt-1 text-sm text-muted-foreground'>Choose how Tooang appears on this device.</p>
          <div className='mt-3 grid grid-cols-3 gap-2'>
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type='button'
                  variant={theme === option.value ? 'secondary' : 'outline'}
                  className='min-w-0 flex-col gap-1 px-2'
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  <Icon aria-hidden /> <span className='truncate'>{option.label}</span>
                </Button>
              );
            })}
          </div>
        </fieldset>

        <div className='border-t pt-4'>
          <Button type='button' variant='ghost' onClick={() => void signOut()} disabled={logout.isPending}>
            {logout.isPending ? (
              <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden />
            ) : (
              <LogOutIcon aria-hidden />
            )}
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountDeletion() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useAccountDeletionRequestMutation();
  const [open, setOpen] = useState(false);

  if (!user || !user.permissions.includes(PERMISSION.ACCOUNT_DELETION_REQUEST)) return null;

  const error = mutation.error;
  const conflict = isApplicationError(error) && error.httpStatus === 409;
  const network = isApplicationError(error) && error.isNetworkError;
  const fallback = error ? getCustomerErrorPresentation(error) : null;
  const errorCopy = conflict
    ? {
        title: 'Account deletion is currently blocked',
        description:
          'This account is still required for place ownership or platform administration. Transfer the required responsibility, then try again.',
      }
    : network
      ? {
          title: 'Request status is uncertain',
          description:
            'The connection ended before Tooang confirmed the result. Do not assume the request failed; check your connection before trying again.',
        }
      : fallback
        ? { title: fallback.title, description: fallback.description }
        : null;

  const requestDeletion = async () => {
    if (mutation.isPending) return;
    try {
      await mutation.mutateAsync();
      clearPrivateClientSession(queryClient);
      await router.navigate({ to: '/account/deletion-requested', replace: true });
    } catch {
      // The persistent dialog alert provides safe recovery context.
    }
  };

  return (
    <Card className='border-destructive/25' aria-labelledby='account-deletion-title'>
      <CardHeader>
        <h2 id='account-deletion-title' className='text-lg font-semibold'>
          Account deletion
        </h2>
        <CardDescription>
          Requesting deletion starts a pending lifecycle process. It does not immediately erase your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!mutation.isPending) {
              setOpen(nextOpen);
              if (!nextOpen) mutation.reset();
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button type='button' variant='destructive' onClick={() => mutation.reset()}>
              <Trash2Icon aria-hidden /> Request account deletion
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            onEscapeKeyDown={(event) => {
              if (mutation.isPending) event.preventDefault();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Request deletion of your account?</AlertDialogTitle>
              <AlertDialogDescription>
                If accepted, you will be signed out immediately and protected access will stop. Your account enters a
                deletion-pending state, with anonymization or removal completed under the retention process within 30
                days.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className='rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground'>
              The request may be blocked if you are the only owner of an active place or the last active platform
              administrator. Transfer those responsibilities first.
            </div>

            {errorCopy && (
              <CustomerAlert tone='error' title={errorCopy.title} description={errorCopy.description} live />
            )}

            <AlertDialogFooter>
              <AlertDialogCancel autoFocus disabled={mutation.isPending}>
                Keep account
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: 'destructive' }))}
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void requestDeletion();
                }}
              >
                {mutation.isPending && <Loader2Icon className='animate-spin motion-reduce:animate-none' aria-hidden />}
                {mutation.isPending ? 'Requesting…' : 'Request deletion'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export function CustomerProfilePage({ recoveryNotice }: { recoveryNotice?: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className='mx-auto w-full max-w-4xl px-page py-6 sm:py-8'>
      <header>
        <p className='text-sm font-semibold text-primary'>Account</p>
        <h1 className='mt-1 text-2xl font-bold tracking-tight sm:text-3xl' tabIndex={-1}>
          Your profile
        </h1>
        <p className='mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base'>
          Manage your personal information, preferences, and account lifecycle.
        </p>
      </header>

      {recoveryNotice && <div className='mt-5'>{recoveryNotice}</div>}

      <div className='mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]'>
        <div className='space-y-5'>
          <ProfileForm />
          <AccountDeletion />
        </div>
        <AccountNavigation />
      </div>
    </div>
  );
}

export { AccountDeletion, AccountNavigation, ProfileForm, profileValidationIssues };
