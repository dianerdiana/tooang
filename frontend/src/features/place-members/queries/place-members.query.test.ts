import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';
import { placesKeys } from '@/features/places/queries/places.key';

import { invalidateMembershipData } from './place-members.mutation';
import { placeMembersKeys } from './place-members.query';

describe('place-member query cache', () => {
  it('isolates collections by place', () => {
    expect(placeMembersKeys.list('place-1')).not.toEqual(placeMembersKeys.list('place-2'));
  });

  it('invalidates membership, place management, and authenticated session data', async () => {
    const client = new QueryClient();
    client.setQueryData(placeMembersKeys.list('place-1'), []);
    client.setQueryData(AUTH_SESSION_QUERY_KEY, { userId: 'current-user' });
    client.setQueryData(placesKeys.managementDetail('place-1'), { id: 'place-1' });
    await invalidateMembershipData(client, 'place-1');
    expect(client.getQueryState(placeMembersKeys.list('place-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(AUTH_SESSION_QUERY_KEY)?.isInvalidated).toBe(true);
    expect(client.getQueryState(placesKeys.managementDetail('place-1'))?.isInvalidated).toBe(true);
  });
});
