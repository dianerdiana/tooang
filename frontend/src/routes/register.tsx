import { createFileRoute, redirect } from '@tanstack/react-router';

import { RegisterForm } from '@/features/auth/components/register-form';

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) throw redirect({ to: '/' });
  },
  head: () => ({ meta: [{ title: 'Create account | Tooang' }] }),
  component: RegisterRoute,
});

function RegisterRoute() {
  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-subtle to-transparent' />
      <div className='relative w-full max-w-md'>
        <RegisterForm />
      </div>
    </main>
  );
}
