import { describe, expect, it } from 'vitest';

import { apiErrorResponse, apiPaginatedResponse, apiSuccessResponse } from './mock-boundaries';

describe('default Vitest environment', () => {
  it('keeps pure unit tests in Node', () => {
    expect(typeof document).toBe('undefined');
  });

  it('builds only explicitly supplied backend envelopes', () => {
    expect(apiSuccessResponse({ message: 'Cart retrieved', data: { cartId: null } })).toEqual({
      error: false,
      message: 'Cart retrieved',
      data: { cartId: null },
    });
    expect(
      apiPaginatedResponse({
        message: 'Orders retrieved',
        data: [],
        meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
      }),
    ).toEqual({
      error: false,
      message: 'Orders retrieved',
      data: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    expect(apiErrorResponse({ error: true, message: 'Cart changed', code: 'CART_CONCURRENT_MODIFICATION' })).toEqual({
      error: true,
      message: 'Cart changed',
      code: 'CART_CONCURRENT_MODIFICATION',
    });
  });
});
