import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { PlatformRole } from '@/types/enums/user-role.enum';

const authServiceMock = vi.hoisted(() => ({
  restoreSession: vi.fn(),
}));

vi.mock('@/features/auth/services/auth.service', () => ({ authService: authServiceMock }));

import {
  AUTH_SESSION_QUERY_KEY,
  authSessionQueryOptions,
  clearAuthSession,
  setAuthSession,
} from './auth-session.query';

const user = {
  userId: 'usr_public',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('auth session query', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    authServiceMock.restoreSession.mockReset();
  });

  it('shares one bootstrap and caches the authoritative user', async () => {
    authServiceMock.restoreSession.mockResolvedValue(user);

    const first = queryClient.fetchQuery(authSessionQueryOptions());
    const second = queryClient.fetchQuery(authSessionQueryOptions());

    await expect(Promise.all([first, second])).resolves.toEqual([user, user]);
    expect(authServiceMock.restoreSession).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toBe(user);
  });

  it('does not cache user data when bootstrap fails', async () => {
    authServiceMock.restoreSession.mockRejectedValue({
      error: true,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      httpStatus: 401,
      isNetworkError: false,
    });

    await expect(queryClient.fetchQuery(authSessionQueryOptions())).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toBeUndefined();
    expect(authServiceMock.restoreSession).toHaveBeenCalledOnce();
  });

  it('stores login state and clears it without re-bootstrap data', () => {
    queryClient.setQueryData(['/places'], [{ placeId: 'place-one' }]);

    setAuthSession(queryClient, user);
    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toBe(user);

    clearAuthSession(queryClient);
    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toBeNull();
    expect(queryClient.getQueryData(['/places'])).toBeUndefined();
  });
});
