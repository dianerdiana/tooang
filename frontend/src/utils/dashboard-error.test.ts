import { describe, expect, it } from 'vitest';

import type { ApplicationError } from '@/types/api-response.type';

import { getDashboardErrorPresentation, getSafeMutationError } from './dashboard-error';

const applicationError = (overrides: Partial<ApplicationError>): ApplicationError => ({
  error: true,
  message: 'sensitive backend diagnostic',
  code: 'REQUEST_FAILED',
  isNetworkError: false,
  ...overrides,
});

describe('dashboard error presentation', () => {
  it.each([
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [409, 'conflict', true],
    [503, 'server', true],
  ] as const)('classifies HTTP %i responses', (httpStatus, kind, canRetry) => {
    expect(getDashboardErrorPresentation(applicationError({ httpStatus }))).toMatchObject({ kind, canRetry });
  });

  it('classifies connection failures without exposing transport text', () => {
    const presentation = getDashboardErrorPresentation(
      applicationError({ message: 'AxiosError: socket hang up', code: 'ERR_NETWORK', isNetworkError: true }),
    );

    expect(presentation.kind).toBe('network');
    expect(presentation.description).not.toContain('AxiosError');
    expect(presentation.description).not.toContain('socket hang up');
  });

  it('uses controlled copy for unexpected and malformed errors', () => {
    const presentation = getDashboardErrorPresentation(new Error('private stack detail'));

    expect(presentation.kind).toBe('unexpected');
    expect(presentation.description).not.toContain('private stack detail');
  });

  it('preserves only expected conflict messages', () => {
    expect(
      getSafeMutationError(applicationError({ httpStatus: 409, message: 'Order already changed' }), 'Fallback'),
    ).toBe('Order already changed');
    expect(getSafeMutationError(applicationError({ httpStatus: 500 }), 'Safe fallback')).toBe(
      'Tooang could not complete this request. Please try again shortly.',
    );
  });
});
