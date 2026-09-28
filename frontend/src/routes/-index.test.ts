import { describe, expect, it } from 'vitest';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { Route } from './index';

const runBeforeLoad = (isAuthenticated: boolean, user: AuthenticatedUser | null) => {
  if (!Route.options.beforeLoad) return null;

  try {
    return Route.options.beforeLoad({
      context: { auth: { isAuthenticated, isInitialLoading: false, user } },
      location: { href: '/', pathname: '/' },
      search: {},
    } as never);
  } catch (error) {
    return error;
  }
};

describe('/ route access', () => {
  it('has no authentication guard', () => {
    expect(Route.options.beforeLoad).toBeUndefined();
  });

  it.each([
    ['unauthenticated visitors', false, null],
    ['authenticated visitors', true, {} as AuthenticatedUser],
  ])('does not redirect %s', (_label, isAuthenticated, user) => {
    expect(runBeforeLoad(isAuthenticated, user)).toBeNull();
  });
});
