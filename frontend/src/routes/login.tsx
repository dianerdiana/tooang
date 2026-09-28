import { createFileRoute, redirect } from '@tanstack/react-router';

import { LoginForm } from '@/features/auth/components/login-form';

import { getProtectedActionReturnTarget } from '@/utils/auth/protected-action-intent';

type LoginSearch = {
  intent?: string;
  redirect?: string;
};

const isIntentId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    intent: isIntentId(search.intent) ? search.intent.toLowerCase() : undefined,
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ href: getProtectedActionReturnTarget(search.intent, search.redirect) });
    }
  },
  head: () => ({ meta: [{ title: 'Sign in | Tooang' }] }),
  component: LoginRoute,
});

function LoginRoute() {
  const { intent, redirect: redirectTarget } = Route.useSearch();

  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10'>
      <div className='pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary-subtle to-transparent' />
      <div className='relative w-full max-w-md'>
        <LoginForm intentId={intent} redirectTo={redirectTarget} />
      </div>
    </main>
  );
}
