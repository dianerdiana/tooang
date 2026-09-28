import { redirect } from '@tanstack/react-router';

import { getSafeRedirectTarget } from './route-guard';

import type { RouterContext } from '@/router';

type CustomerAuthContext = Pick<RouterContext, 'auth'>;

export function requireCustomerAuth(context: CustomerAuthContext, requestedPath: string) {
  if (context.auth.isAuthenticated && context.auth.user) return;

  throw redirect({
    to: '/login',
    search: { redirect: getSafeRedirectTarget(requestedPath) },
    replace: true,
  });
}
