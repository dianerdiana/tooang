import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getToken: vi.fn(),
  setToken: vi.fn(),
  removeToken: vi.fn(),
  refreshAccessToken: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { authService } from './auth.service';

const profile = {
  userId: 'usr_public',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [
    {
      placeId: 'place-owner',
      role: PlaceMemberRole.OWNER,
      permissions: [PERMISSION.PLACE_READ, PERMISSION.PLACE_UPDATE],
      effectivePermissions: [PERMISSION.PLACE_READ, PERMISSION.PLACE_UPDATE],
    },
    {
      placeId: 'place-cashier',
      role: PlaceMemberRole.CASHIER,
      permissions: [PERMISSION.ORDER_READ, PERMISSION.ORDER_CONFIRM],
      effectivePermissions: [PERMISSION.ORDER_READ, PERMISSION.ORDER_CONFIRM],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('authService', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.post.mockReset();
    apiMock.getToken.mockReset();
    apiMock.setToken.mockReset();
    apiMock.removeToken.mockReset();
    apiMock.refreshAccessToken.mockReset();
    apiMock.logout.mockReset();
    apiMock.getToken.mockReturnValue(null);
    apiMock.refreshAccessToken.mockResolvedValue('refreshed-token');
    apiMock.logout.mockResolvedValue(undefined);
    apiMock.get.mockResolvedValue({
      data: { error: false, message: 'Profile retrieved', data: { user: profile } },
    });
  });

  it('restores a cookie-backed session and hydrates it from /me', async () => {
    const authenticatedUser = await authService.restoreSession();

    expect(authenticatedUser).toEqual(profile);
    expect(authenticatedUser).not.toBe(profile);
    expect(authenticatedUser.placeMemberships[0]).not.toBe(profile.placeMemberships[0]);
    expect(apiMock.refreshAccessToken).toHaveBeenCalledOnce();
    expect(apiMock.get).toHaveBeenCalledWith('/me');
  });

  it('uses an existing access token to hydrate /me without refreshing', async () => {
    apiMock.getToken.mockReturnValue('access-token');

    await expect(authService.restoreSession()).resolves.toEqual(profile);
    expect(apiMock.refreshAccessToken).not.toHaveBeenCalled();
    expect(apiMock.get).toHaveBeenCalledWith('/me');
  });

  it('hydrates /me after login instead of trusting the login summary', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        error: false,
        message: 'Login successful',
        data: {
          accessToken: 'access-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: {
            userId: profile.userId,
            fullName: profile.fullName,
            email: profile.email,
            platformRole: profile.platformRole,
          },
        },
      },
    });

    await expect(
      authService.login({ email: 'dian@example.com', password: 'correct-horse-battery-staple' }),
    ).resolves.toEqual(profile);
    expect(apiMock.setToken).toHaveBeenCalledWith('access-token');
    expect(apiMock.get).toHaveBeenCalledWith('/me');
  });

  it('exposes normalized application errors when session restoration fails', async () => {
    apiMock.refreshAccessToken.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: {
        status: 401,
        data: { error: true, message: 'Unauthorized', code: 'UNAUTHORIZED' },
      },
    });

    await expect(authService.restoreSession()).rejects.toEqual({
      error: true,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      httpStatus: 401,
      isNetworkError: false,
    });
  });

  it('exposes normalized application errors when logout fails', async () => {
    apiMock.logout.mockRejectedValue({
      isAxiosError: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
    });

    await expect(authService.logout()).rejects.toEqual({
      error: true,
      message: 'Network Error',
      code: 'ERR_NETWORK',
      httpStatus: undefined,
      isNetworkError: true,
    });
  });
});
