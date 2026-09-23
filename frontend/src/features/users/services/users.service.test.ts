import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { PlatformRole } from '@/types/enums/user-role.enum';

import { usersService } from './users.service';

const listResponse = {
  data: {
    error: false,
    message: 'Users retrieved',
    data: { users: [] },
    meta: { page: 2, limit: 20, totalItems: 21, totalPages: 2 },
  },
};

describe('usersService', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.delete.mockReset();
    apiMock.get.mockResolvedValue(listResponse);
  });

  it('sends only normalized documented list parameters', async () => {
    await expect(
      usersService.list({
        page: 2,
        search: '  Dian ',
        platformRole: PlatformRole.ADMIN,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    ).resolves.toEqual({ users: [], meta: listResponse.data.meta });

    expect(apiMock.get).toHaveBeenCalledWith('/users', {
      params: {
        page: 2,
        limit: 20,
        search: 'Dian',
        platformRole: PlatformRole.ADMIN,
        sortBy: 'fullName',
        sortOrder: 'asc',
      },
    });
  });

  it('deactivates through DELETE without sending a request body', async () => {
    const result = { userId: 'usr_target', deletedAt: '2026-09-23T00:00:00.000Z' };
    apiMock.delete.mockResolvedValueOnce({
      data: { error: false, message: 'User deactivated', data: result },
    });

    await expect(usersService.deactivate('usr_target')).resolves.toEqual(result);
    expect(apiMock.delete).toHaveBeenCalledWith('/users/usr_target');
  });

  it('normalizes list and mutation failures', async () => {
    apiMock.get.mockRejectedValueOnce(new Error('Users unavailable'));
    apiMock.delete.mockRejectedValueOnce({
      error: true,
      message: 'Protected target',
      code: 'FORBIDDEN',
    });

    await expect(usersService.list({})).rejects.toMatchObject({
      message: 'Users unavailable',
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    });
    await expect(usersService.deactivate('usr_target')).rejects.toMatchObject({
      message: 'Protected target',
      code: 'FORBIDDEN',
      isNetworkError: false,
    });
  });
});
