import { describe, expect, it } from 'vitest';

import { isRedirect } from '@tanstack/react-router';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { requireCustomerAuth } from '../customer-access';

function runGuard(isAuthenticated: boolean, user: AuthenticatedUser | null, requestedPath: string) {
  try {
    requireCustomerAuth({ auth: { isAuthenticated, isInitialLoading: false, user } }, requestedPath);
    return null;
  } catch (error) {
    return error;
  }
}

describe('customer auth guard', () => {
  it('allows an authenticated active principal', () => {
    expect(runGuard(true, {} as AuthenticatedUser, '/orders')).toBeNull();
  });

  it('redirects a customer deep link to login with its local return URL', () => {
    const result = runGuard(false, null, '/places/nasi-bakar/cart?from=menu');
    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) {
      expect(result.options).toMatchObject({
        to: '/login',
        search: { redirect: '/places/nasi-bakar/cart?from=menu' },
        replace: true,
      });
    }
  });

  it('sanitizes an unsafe return URL', () => {
    const result = runGuard(false, null, 'https://evil.example/steal');
    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) expect(result.options.search).toEqual({ redirect: '/' });
  });

  it('does not accept an authentication flag without a hydrated principal', () => {
    expect(isRedirect(runGuard(true, null, '/orders'))).toBe(true);
  });
});
