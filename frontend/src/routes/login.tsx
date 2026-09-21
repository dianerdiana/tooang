import { createFileRoute, redirect } from '@tanstack/react-router';

import { LoginForm } from '@/features/auth/components/login-form';

import { getSafeRedirectTarget } from '@/utils/auth/route-guard';

type LoginSearch = {
  redirect?: string;
};

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: getSafeRedirectTarget(search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: 'Sign in | Tooang' }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect: redirectTarget } = Route.useSearch();

  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-subtle to-transparent' />
      <div className='relative w-full max-w-md'>
        <LoginForm redirectTo={getSafeRedirectTarget(redirectTarget)} />
      </div>
    </main>
  );
}
