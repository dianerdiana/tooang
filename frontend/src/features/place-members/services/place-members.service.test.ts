import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), put: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { placeMembersService } from './place-members.service';

const member = {
  membershipId: 'membership-1',
  placeId: 'place-1',
  user: { userId: 'user/public', fullName: 'Cashier One', email: 'cashier@example.com' },
  role: 'CASHIER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  revokedAt: null,
};
const success = (data: object) => ({ data: { error: false, message: 'Success', data } });

describe('placeMembersService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('reads the unpaginated collection scoped to a place', async () => {
    apiMock.get.mockResolvedValueOnce(success({ members: [member] }));
    await expect(placeMembersService.list('place-1')).resolves.toEqual([member]);
    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/members');
  });

  it('assigns documented CASHIER and OWNER roles and encodes the public user identifier', async () => {
    apiMock.put.mockResolvedValueOnce(success({ member }));
    await placeMembersService.setCashier('place-1', 'user/public', { role: 'CASHIER' });
    expect(apiMock.put).toHaveBeenCalledWith('/places/place-1/members/user%2Fpublic', { role: 'CASHIER' });
    apiMock.put.mockResolvedValueOnce(success({ member: { ...member, role: 'OWNER' } }));
    await placeMembersService.setOwner('place-1', 'owner/public', { role: 'OWNER' });
    expect(apiMock.put).toHaveBeenCalledWith('/places/place-1/members/owner%2Fpublic', { role: 'OWNER' });
    await expect(placeMembersService.set('place-1', 'user', { role: 'MANAGER' as 'OWNER' })).rejects.toMatchObject({
      code: 'APPLICATION_ERROR',
    });
    expect(apiMock.put).toHaveBeenCalledTimes(2);
  });

  it('revokes through the place-scoped membership endpoint', async () => {
    apiMock.delete.mockResolvedValueOnce(success({ member: { ...member, revokedAt: '2026-02-01T00:00:00.000Z' } }));
    await placeMembersService.revoke('place-1', 'user/public');
    expect(apiMock.delete).toHaveBeenCalledWith('/places/place-1/members/user%2Fpublic');
  });
});
