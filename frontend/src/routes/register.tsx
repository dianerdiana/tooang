import { createFileRoute, redirect } from '@tanstack/react-router';

import { RegisterForm } from '@/features/auth/components/register-form';

import { parseAuthEntrySearch } from '@/utils/auth/auth-entry-search';
import { getProtectedActionReturnTarget } from '@/utils/auth/protected-action-intent';

export const Route = createFileRoute('/register')({
  validateSearch: parseAuthEntrySearch,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: getProtectedActionReturnTarget(search.intent, search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: 'Create account | Tooang' }] }),
  component: RegisterRoute,
});

function RegisterRoute() {
  const { intent, redirect: redirectTarget } = Route.useSearch();

  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-subtle to-transparent' />
      <div className='relative w-full max-w-[27.5rem]'>
        <RegisterForm intentId={intent} redirectTo={redirectTarget} />
      </div>
    </main>
  );
}
