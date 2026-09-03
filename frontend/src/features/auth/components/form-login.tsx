import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { getSafeRedirectTarget } from '@/utils/auth/route-guard';
import { useAppForm } from '@/utils/hooks/use-app-form';
import { useAuth } from '@/utils/hooks/use-auth';

import { loginSchema } from '../auth.schema';

export function FormLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: '/_layout-blank/auth/login' });
  const queryClient = useQueryClient();

  const showBookingLoginAlert = search.reason === 'booking-auth';
  const mutation = useMutation({
    mutationFn: login,
    mutationKey: ['auth', 'login'],
  });

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: ({ value }) =>
      mutation.mutate(value, {
        onSuccess: (props) => {
          if (props.status === 'success') {
            queryClient.removeQueries();

            toast.success(`Welcome to SehatMurah, ${props.data.user.name}`);
            navigate({ to: getSafeRedirectTarget(search.redirect) });
          } else {
            toast.error(props.message);
          }
        },
        onError: (error) => {
          toast.error(error.message || 'Login failed. Please try again.');
        },
      }),
  });

  return (
    <form
      className='flex flex-col gap-6'
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      {showBookingLoginAlert ? (
        <div role='alert' className='rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
          You need to login first before creating a booking.
        </div>
      ) : null}

      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-medium'>Hi, Welcome! 👋</h1>
        <p className='text-sm text-balance text-muted-foreground'>Please login to continue access your account</p>
      </div>
      <FieldGroup>
        <form.AppField name='email'>
          {(field) => <field.TextField id='email' name='email' label='Email' placeholder='example@mail.com' />}
        </form.AppField>
        <Field>
          <div className='flex items-center'>
            <FieldLabel htmlFor='password'>Password</FieldLabel>
            <a href='#' className='ml-auto text-sm underline-offset-4 hover:underline'>
              Lupa Password?
            </a>
          </div>
          <form.Field
            name='password'
            children={(field) => (
              <>
                <Input
                  value={field.state.value}
                  id='password'
                  type='password'
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={!field.state.meta.isValid}
                />

                {!field.state.meta.isValid && <FieldError>{field.state.meta.errors[0]?.message}</FieldError>}
              </>
            )}
          />
        </Field>
        <form.Subscribe
          selector={(state) => [state.isSubmitting]}
          children={([isSubmitting]) => (
            <Button type='submit' disabled={isSubmitting}>
              Login
            </Button>
          )}
        />

        <p className='text-sm text-muted-foreground text-center'>
          Don't have an account?{' '}
          <Link to='/auth/register' className='underline text-primary underline-offset-4 hover:no-underline'>
            Register
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
