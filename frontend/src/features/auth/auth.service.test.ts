import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlatformRole } from '@/types/enums/user-role.enum';

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
  permissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('authService', () => {
  beforeEach(() => {
    apiMock.getToken.mockReturnValue(null);
    apiMock.refreshAccessToken.mockResolvedValue('refreshed-token');
    apiMock.get.mockResolvedValue({
      data: { error: false, message: 'Profile retrieved', data: { user: profile } },
    });
  });

  it('restores a cookie-backed session and hydrates it from /me', async () => {
    await expect(authService.restoreSession()).resolves.toEqual(profile);
    expect(apiMock.refreshAccessToken).toHaveBeenCalledOnce();
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
});
