import { describe, expect, it } from 'vitest';

import { buildApiBaseUrl, normalizeServerOrigin } from './env';

describe('buildApiBaseUrl', () => {
  it('uses the documented API version and normalizes a trailing slash', () => {
    expect(buildApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com/api/v1');
  });

  it.each([undefined, '', '   '])('requires a configured server origin (%s)', (value) => {
    expect(() => buildApiBaseUrl(value)).toThrow('VITE_BASE_SERVER_URL is required');
  });

  it.each(['api.example.com', 'ftp://api.example.com'])('rejects non-http origins (%s)', (value) => {
    expect(() => buildApiBaseUrl(value)).toThrow('absolute HTTP(S) origin');
  });

  it.each([
    'https://api.example.com/api',
    'https://api.example.com/api/v1',
    'https://api.example.com?tenant=one',
    'https://api.example.com#config',
    'https://user:password@api.example.com',
  ])('rejects values that contain more than an origin (%s)', (value) => {
    expect(() => normalizeServerOrigin(value)).toThrow('must contain only the server origin');
  });
});
