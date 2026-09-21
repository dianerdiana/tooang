import { describe, expect, it } from 'vitest';

import { toApiError } from './api-error.util';

describe('toApiError', () => {
  it('preserves a normalized backend error and adds its HTTP status', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          error: true,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: [{ field: 'email', message: 'Email is invalid' }],
        },
      },
    };

    expect(toApiError(error)).toEqual({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: [{ field: 'email', message: 'Email is invalid' }],
      httpStatus: 422,
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
});
