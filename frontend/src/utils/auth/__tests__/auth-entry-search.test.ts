import { describe, expect, it } from 'vitest';

import { buildAuthEntrySearch, parseAuthEntrySearch } from '../auth-entry-search';

const INTENT_ID = '92f3f96b-c1ee-4d74-97cb-e0230767276b';

describe('auth entry search', () => {
  it('preserves sanitized customer flow metadata', () => {
    expect(
      parseAuthEntrySearch({
        intent: INTENT_ID.toUpperCase(),
        redirect: '/orders?status=ready#latest',
        registered: 'true',
      }),
    ).toEqual({ intent: INTENT_ID, redirect: '/orders?status=ready#latest', registered: true });
  });

  it.each([
    'https://tooang.test/orders',
    '//evil.test/orders',
    '/\\evil.test/orders',
    '/%2f%2fevil.test/orders',
    '/orders\u0000',
  ])('replaces an unsafe redirect with the customer fallback: %s', (redirect) => {
    expect(parseAuthEntrySearch({ redirect }).redirect).toBe('/');
  });

  it('drops malformed intent and success metadata', () => {
    expect(parseAuthEntrySearch({ intent: 'not-a-uuid', redirect: '/account/profile', registered: 'yes' })).toEqual({
      redirect: '/account/profile',
    });
  });

  it('builds only validated values for route links', () => {
    expect(buildAuthEntrySearch({ intent: INTENT_ID, redirect: '//evil.test', registered: true })).toEqual({
      intent: INTENT_ID,
      redirect: '/',
      registered: true,
    });
  });
});
