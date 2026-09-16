import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { invalidateMembershipData } from './place-members.mutation';
import { placeMembersKeys } from './place-members.query';

describe('place-member query cache', () => {
  it('isolates collections by place', () => {
    expect(placeMembersKeys.list('place-1')).not.toEqual(placeMembersKeys.list('place-2'));
  });

  it('invalidates the selected place list and authenticated session', async () => {
    const client = new QueryClient();
    client.setQueryData(placeMembersKeys.list('place-1'), []);
    client.setQueryData(AUTH_SESSION_QUERY_KEY, { userId: 'current-user' });
    await invalidateMembershipData(client, 'place-1');
    expect(client.getQueryState(placeMembersKeys.list('place-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(AUTH_SESSION_QUERY_KEY)?.isInvalidated).toBe(true);
  });
});
