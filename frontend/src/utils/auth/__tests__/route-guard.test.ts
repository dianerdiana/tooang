import { describe, expect, it } from 'vitest';

import { getSafeRedirectTarget } from '../route-guard';

describe('getSafeRedirectTarget', () => {
  it.each([
    undefined,
    '',
    'https://example.com',
    'https://tooang.test/orders',
    '//example.com',
    '/\\example.com/orders',
    '/%2f%2fexample.com/orders',
    '/%5cexample.com/orders',
    '/orders%0aheader',
    '/orders%',
    '/orders\nheader',
  ])('falls back for %s', (target) => {
    expect(getSafeRedirectTarget(target, 'https://tooang.test')).toBe('/');
  });

  it('keeps a local path with query and hash state', () => {
    expect(getSafeRedirectTarget('/orders?status=PENDING#active', 'https://tooang.test')).toBe(
      '/orders?status=PENDING#active',
    );
  });
});
