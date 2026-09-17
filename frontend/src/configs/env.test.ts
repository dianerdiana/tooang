import { describe, expect, it } from 'vitest';

import { buildApiBaseUrl } from './env';

describe('buildApiBaseUrl', () => {
  it('uses the documented API version and removes trailing slashes', () => {
    expect(buildApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com/api/v1');
  });

  it('uses the localhost fallback for an absent value', () => {
    expect(buildApiBaseUrl(undefined)).toBe('http://localhost:5000/api/v1');
  });

  it('rejects non-http server URLs', () => {
    expect(() => buildApiBaseUrl('api.example.com')).toThrow('absolute HTTP(S) URL');
  });
});
