import { describe, expect, it } from 'vitest';

import { toApiError } from './api-error.util';

describe('toApiError', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
  ])('preserves a backend %i error and adds its HTTP status', (status, code) => {
    const error = {
      isAxiosError: true,
      message: `Request failed with status code ${status}`,
      response: {
        status,
        data: {
          error: true,
          message: 'Backend rejected the request',
          code,
          details: [{ field: 'placeId', message: 'Place is unavailable', resourceId: 'place-one' }],
        },
      },
    };

    expect(toApiError(error)).toEqual({
      error: true,
      message: 'Backend rejected the request',
      code,
      details: [{ field: 'placeId', message: 'Place is unavailable', resourceId: 'place-one' }],
      httpStatus: status,
      isNetworkError: false,
    });
  });

  it('normalizes an Axios response that does not use the backend error envelope', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 502',
      code: 'ERR_BAD_RESPONSE',
      response: { status: 502, data: 'Bad Gateway' },
    };

    expect(toApiError(error)).toEqual({
      error: true,
      message: 'Request failed with status code 502',
      code: 'ERR_BAD_RESPONSE',
      httpStatus: 502,
      isNetworkError: false,
    });
  });

  it('marks Axios failures without a response as network errors', () => {
    const error = {
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };

    expect(toApiError(error)).toEqual({
      error: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
      httpStatus: undefined,
      isNetworkError: true,
    });
  });

  it('uses stable codes for plain and unknown errors', () => {
    expect(toApiError(new Error('Client failed'))).toEqual({
      error: true,
      message: 'Client failed',
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    });
    expect(toApiError(null)).toEqual({
      error: true,
      message: 'Unknown error',
      code: 'UNKNOWN_ERROR',
      isNetworkError: false,
    });
  });

  it('returns an already normalized application error unchanged', () => {
    const error = {
      error: true as const,
      message: 'Request failed',
      code: 'CONFLICT',
      httpStatus: 409,
      isNetworkError: false,
    };

    expect(toApiError(error)).toBe(error);
  });
});
