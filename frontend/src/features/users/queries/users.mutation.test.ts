import { describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { usersKeys } from './users.key';
import { invalidateUsers, refreshPlatformRoleData } from './users.mutation';

describe('user mutations', () => {
  it('invalidates the complete users namespace after deactivation', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    await invalidateUsers(queryClient);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('refreshes user lists, the target detail, and authenticated session after role changes', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(usersKeys.list({}), { users: [] });
    queryClient.setQueryData(usersKeys.detail('usr_target'), { userId: 'usr_target' });
    queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, { userId: 'current' });

    await refreshPlatformRoleData(queryClient, 'usr_target');

    expect(queryClient.getQueryState(usersKeys.list({}))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(usersKeys.detail('usr_target'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(AUTH_SESSION_QUERY_KEY)?.isInvalidated).toBe(true);
  });
});
