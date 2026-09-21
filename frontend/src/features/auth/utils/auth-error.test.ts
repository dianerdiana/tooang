import { describe, expect, it } from 'vitest';

import { getLoginErrorMessage } from './auth-error';

describe('getLoginErrorMessage', () => {
  it('uses a friendly invalid-credentials message for 401 responses', () => {
    expect(
      getLoginErrorMessage({
        error: true,
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        httpStatus: 401,
        isNetworkError: false,
      }),
    ).toBe('The email or password you entered is incorrect.');
  });

  it('uses a connection message for network failures', () => {
    expect(
      getLoginErrorMessage({
        error: true,
        message: 'Network Error',
        code: 'NETWORK_ERROR',
        isNetworkError: true,
      }),
    ).toContain('Check your connection');
  });

  it('preserves a normalized backend message for other failures', () => {
    expect(
      getLoginErrorMessage({
        error: true,
        message: 'Account is unavailable',
        code: 'ACCOUNT_UNAVAILABLE',
        httpStatus: 409,
        isNetworkError: false,
      }),
    ).toBe('Account is unavailable');
  });
});
