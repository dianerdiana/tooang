import { describe, expect, it } from 'vitest';

import type { ApplicationError } from '@/types/api-response.type';

import { getCheckoutErrorPresentation, getCustomerErrorPresentation } from '../customer-error-presentation';

const error = (overrides: Partial<ApplicationError> = {}): ApplicationError => ({
  error: true,
  code: 'UNEXPECTED',
  message: 'AxiosError: secret database and token details',
  isNetworkError: false,
  ...overrides,
});

describe('customer error presentation', () => {
  it.each([
    [400, 'validation', 'adjust-input'],
    [401, 'authentication', 'sign-in'],
    [403, 'forbidden', 'go-back'],
    [404, 'not-found', 'go-back'],
    [409, 'conflict', 'refresh'],
    [429, 'rate-limit', 'retry'],
    [503, 'server', 'retry'],
  ] as const)('maps HTTP %i to safe %s recovery', (httpStatus, kind, action) => {
    expect(getCustomerErrorPresentation(error({ httpStatus }))).toMatchObject({ kind, action });
  });

  it('maps a normalized network error without exposing its message', () => {
    const result = getCustomerErrorPresentation(error({ isNetworkError: true, code: 'ERR_NETWORK' }));
    expect(result).toMatchObject({ kind: 'network', action: 'retry' });
    expect(JSON.stringify(result)).not.toContain('AxiosError');
    expect(JSON.stringify(result)).not.toContain('token');
  });

  it('uses the same neutral presentation for verification not-found cases', () => {
    const result = getCustomerErrorPresentation(
      error({ httpStatus: 404, code: 'ORDER_VERIFICATION_NOT_FOUND', message: 'Opaque token expired' }),
    );
    expect(result).toMatchObject({
      kind: 'not-found',
      title: 'Verification unavailable',
      action: 'discover',
    });
    expect(result.description).not.toContain('expired');
    expect(result.description).not.toContain('token');
  });

  it.each([
    ['MENU_ITEM_UNAVAILABLE', 'return-to-menu'],
    ['CART_ITEM_QUANTITY_LIMIT', 'review-cart'],
    ['CART_DISTINCT_ITEM_LIMIT', 'review-cart'],
    ['CART_TOTAL_QUANTITY_LIMIT', 'review-cart'],
    ['CART_CONCURRENT_MODIFICATION', 'refresh'],
    ['CHECKOUT_CONCURRENT_MODIFICATION', 'review-cart'],
    ['CART_EMPTY', 'return-to-menu'],
    ['CART_ITEM_INVALID', 'review-cart'],
    ['PLACE_CLOSED', 'return-to-menu'],
    ['ORDERING_DISABLED', 'return-to-menu'],
    ['ORDER_TOTAL_OUT_OF_RANGE', 'review-cart'],
    ['IDEMPOTENCY_KEY_REUSED', 'review-cart'],
    ['ORDER_PENDING_EXPIRED', 'view-orders'],
    ['ORDER_STATUS_CHANGED', 'refresh'],
    ['ORDER_STATUS_TRANSITION_INVALID', 'refresh'],
  ] as const)('preserves the recovery distinction for %s', (code, action) => {
    expect(getCustomerErrorPresentation(error({ httpStatus: 409, code }))).toMatchObject({ action });
  });

  it('does not call an uncertain checkout result a definite failure', () => {
    const result = getCheckoutErrorPresentation(error({ isNetworkError: true, code: 'ERR_NETWORK' }));
    expect(result).toMatchObject({
      title: 'Order status is uncertain',
      action: 'view-orders',
    });
    expect(result.description).toContain('may already exist');
    expect(result.description).not.toContain('failed');
  });

  it('falls back safely for unknown and non-normalized errors', () => {
    const result = getCustomerErrorPresentation(new Error('Prisma secret'));
    expect(result).toMatchObject({ kind: 'unexpected', action: 'retry' });
    expect(JSON.stringify(result)).not.toContain('Prisma');
  });
});
