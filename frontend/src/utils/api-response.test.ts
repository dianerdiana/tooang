import { describe, expect, it } from 'vitest';

import { toApiError } from './api-error.util';
import { unwrapApiResponse } from './api-response.util';

describe('unwrapApiResponse', () => {
  it('returns data from the backend success envelope', () => {
    expect(unwrapApiResponse({ error: false, message: 'ok', data: { id: 'public-id' } })).toEqual({
      id: 'public-id',
    });
  });

  it('throws the backend error envelope', () => {
    const response = { error: true as const, message: 'denied', code: 'FORBIDDEN' };
    expect(() => unwrapApiResponse(response)).toThrow(response);
    expect(toApiError(response)).toBe(response);
  });
});
