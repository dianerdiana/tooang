import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useAppForm } from '@/utils/hooks/use-app-form';
import { useAuth } from '@/utils/hooks/use-auth';

import { registerSchema } from '../auth.schema';

export function FormRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: register,
    mutationKey: ['auth', 'register'],
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    validators: {
      onSubmit: registerSchema,
    },
    onSubmit: ({ value }) =>
      mutation.mutate(value, {
        onSuccess: (props) => {
          if (props.status === 'success') {
            toast.success('Registration successful. Please login to continue.');
            navigate({ to: '/auth/login' });
          } else {
            toast.error(props.message);
          }
        },
        onError: (error) => {
          toast.error(error.message || 'Registration failed. Please try again.');
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
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-medium'>Create your account</h1>
        <p className='text-sm text-balance text-muted-foreground'>Sign up to start booking doctors easily</p>
      </div>
      <FieldGroup>
        <form.AppField name='name'>
          {(field) => <field.TextField id='name' name='name' label='Name' placeholder='Your full name' />}
        </form.AppField>

        <form.AppField name='email'>
          {(field) => <field.TextField id='email' name='email' label='Email' placeholder='example@mail.com' />}
        </form.AppField>

        <Field>
          <div className='flex items-center'>
            <FieldLabel htmlFor='password'>Password</FieldLabel>
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
              Register
            </Button>
          )}
        />

        <p className='text-sm text-muted-foreground text-center'>
          Already have an account?{' '}
          <Link to='/auth/login' className='underline text-primary underline-offset-4 hover:no-underline'>
            Login
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
