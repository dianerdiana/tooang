import { createFileRoute, redirect } from '@tanstack/react-router';

import { LoginForm } from '@/features/auth/components/login-form';

import { parseAuthEntrySearch } from '@/utils/auth/auth-entry-search';
import { getProtectedActionReturnTarget } from '@/utils/auth/protected-action-intent';

export const Route = createFileRoute('/login')({
  validateSearch: parseAuthEntrySearch,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: getProtectedActionReturnTarget(search.intent, search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: 'Sign in | Tooang' }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const { intent, redirect: redirectTarget, registered } = Route.useSearch();

  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-subtle to-transparent' />
      <div className='relative w-full max-w-[27.5rem]'>
        <LoginForm intentId={intent} redirectTo={redirectTarget} registrationComplete={registered} />
      </div>
    </main>
  );
}
