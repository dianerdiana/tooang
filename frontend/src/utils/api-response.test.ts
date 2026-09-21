import { describe, expect, it } from 'vitest';

import type { ApiSuccessResponse } from '@/types/api-response.type';

import { toApiError } from './api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from './api-response.util';

describe('unwrapApiResponse', () => {
  it('represents a backend success envelope without data', () => {
    const response: ApiSuccessResponse = { error: false, message: 'Logout successful' };

    expect(response.data).toBeUndefined();
  });

  it('returns data from the backend success envelope', () => {
    expect(unwrapApiResponse({ error: false, message: 'ok', data: { id: 'public-id' } })).toEqual({
      id: 'public-id',
    });
  });

  it('throws the backend error envelope', () => {
    const response = { error: true as const, message: 'denied', code: 'FORBIDDEN' };
    expect(() => unwrapApiResponse(response)).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN', isNetworkError: false }),
    );
  });

  it('rejects a success envelope that omits required response data', () => {
    expect(() => unwrapApiResponse({ error: false, message: 'ok' })).toThrow(
      expect.objectContaining({ code: 'INVALID_API_RESPONSE', isNetworkError: false }),
    );
  });

  it('unwraps data and backend pagination metadata', () => {
    expect(
      unwrapPaginatedApiResponse({
        error: false,
        message: 'ok',
        data: [{ id: 'public-id' }],
        meta: {
          page: 2,
          limit: 20,
          search: 'dian',
          column: 'createdAt',
          sort: 'desc',
          totalItems: 25,
          totalPages: 2,
        },
      }),
    ).toEqual({
      items: [{ id: 'public-id' }],
      meta: {
        page: 2,
        limit: 20,
        search: 'dian',
        column: 'createdAt',
        sort: 'desc',
        totalItems: 25,
        totalPages: 2,
      },
    });
  });

  it('rejects a paginated success envelope without metadata', () => {
    expect(() => unwrapPaginatedApiResponse({ error: false, message: 'ok', data: [] } as never)).toThrow(
      expect.objectContaining({ code: 'INVALID_API_RESPONSE' }),
    );
  });

  it('normalizes a backend error independently of Axios', () => {
    expect(toApiError({ error: true, message: 'denied', code: 'FORBIDDEN' })).toEqual({
      error: true,
      message: 'denied',
      code: 'FORBIDDEN',
      isNetworkError: false,
    });
  });
});
