import { describe, expect, it } from 'vitest';

import { getUserInitials } from './nav-user';

describe('getUserInitials', () => {
  it('uses the first two name parts', () => {
    expect(getUserInitials('Dian Erdiana')).toBe('DE');
    expect(getUserInitials('Dian Putra Erdiana')).toBe('DP');
  });

  it('normalizes whitespace and provides a fallback', () => {
    expect(getUserInitials('  tooang  ')).toBe('T');
    expect(getUserInitials('')).toBe('U');
    expect(getUserInitials(null)).toBe('U');
  });
});
