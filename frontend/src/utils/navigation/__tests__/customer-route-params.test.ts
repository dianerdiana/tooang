import { describe, expect, it } from 'vitest';

import { isOrderId, isPublicPlaceSlug, isVerificationToken } from '../customer-route-params';

describe('customer route parameter validation', () => {
  it.each(['warung-kita', 'cafe7', 'a'])('accepts a public place slug: %s', (slug) => {
    expect(isPublicPlaceSlug(slug)).toBe(true);
  });

  it.each(['Uppercase', '-leading', 'two--hyphens', 'with space', ''])('rejects an invalid place slug: %s', (slug) => {
    expect(isPublicPlaceSlug(slug)).toBe(false);
  });

  it('accepts only the documented 43-character URL-safe verification token', () => {
    expect(isVerificationToken('A'.repeat(42) + '_')).toBe(true);
    expect(isVerificationToken('A'.repeat(42))).toBe(false);
    expect(isVerificationToken('A'.repeat(42) + '!')).toBe(false);
  });

  it('accepts UUID order identifiers and rejects arbitrary path input', () => {
    expect(isOrderId('01954b22-ec4e-7aa4-8cb7-91e30b718f30')).toBe(true);
    expect(isOrderId('../other-order')).toBe(false);
  });
});
