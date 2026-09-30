import { describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { PlatformRole } from '@/types/enums/user-role.enum';

import { usersKeys } from '../users.key';
import { invalidateUsers, refreshPlatformRoleData, refreshProfileSession } from '../users.mutation';

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

  it('merges a profile response without losing capabilities and invalidates the exact session', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, {
      userId: 'usr_current',
      fullName: 'Before Name',
      email: 'before@example.com',
      platformRole: PlatformRole.USER,
      permissions: ['profile.read'],
      globalPermissions: [],
      placeMemberships: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    await refreshProfileSession(queryClient, {
      userId: 'usr_current',
      fullName: 'Updated Name',
      email: 'updated@example.com',
      platformRole: PlatformRole.USER,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-30T00:00:00.000Z',
    });

    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toMatchObject({
      fullName: 'Updated Name',
      email: 'updated@example.com',
      permissions: ['profile.read'],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: AUTH_SESSION_QUERY_KEY, exact: true });
  });
});
