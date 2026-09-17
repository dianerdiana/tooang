import { describe, expect, it } from 'vitest';

import { getSafeRedirectTarget } from './route-guard';

describe('getSafeRedirectTarget', () => {
  it.each([undefined, '', 'https://example.com', '//example.com', '/orders\nheader'])('falls back for %s', (target) => {
    expect(getSafeRedirectTarget(target)).toBe('/');
  });

  it('keeps a local absolute path', () => {
    expect(getSafeRedirectTarget('/me/orders?status=PENDING')).toBe('/me/orders?status=PENDING');
  });
});
