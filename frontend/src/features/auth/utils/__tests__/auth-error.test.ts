import { describe, expect, it } from 'vitest';

import { getLoginErrorMessage, getRegisterErrorPresentation } from '../auth-error';

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

  it('does not disclose normalized backend messages for other failures', () => {
    expect(
      getLoginErrorMessage({
        error: true,
        message: 'Account is unavailable',
        code: 'ACCOUNT_UNAVAILABLE',
        httpStatus: 409,
        isNetworkError: false,
      }),
    ).toBe('Unable to sign in. Please try again.');
  });

  it('uses numeric Retry-After guidance when available', () => {
    expect(
      getLoginErrorMessage({
        error: true,
        message: 'Rate limited',
        code: 'RATE_LIMITED',
        httpStatus: 429,
        retryAfterSeconds: 90,
        isNetworkError: false,
      }),
    ).toBe('Too many sign-in attempts. Try again in 2 minutes.');
  });
});

describe('getRegisterErrorPresentation', () => {
  it('maps common passwords and duplicate emails to controlled field feedback', () => {
    expect(
      getRegisterErrorPresentation({
        error: true,
        message: 'Backend implementation detail',
        code: 'COMMON_PASSWORD',
        httpStatus: 400,
        isNetworkError: false,
      }),
    ).toEqual({ message: 'Choose a less common password and try again.', field: 'password' });

    expect(
      getRegisterErrorPresentation({
        error: true,
        message: 'Backend implementation detail',
        code: 'CONFLICT',
        httpStatus: 409,
        isNetworkError: false,
      }),
    ).toEqual({ message: 'An account with this email already exists.', field: 'email' });
  });

  it('uses generic rate-limit guidance without Retry-After', () => {
    expect(
      getRegisterErrorPresentation({
        error: true,
        message: 'Rate limited',
        code: 'RATE_LIMITED',
        httpStatus: 429,
        isNetworkError: false,
      }).message,
    ).toBe('Too many registration attempts. Wait a moment and try again.');
  });
});
