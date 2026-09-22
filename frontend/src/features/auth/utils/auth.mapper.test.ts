import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';

import type { MeUserResponse } from '../types/auth.response';

import { toAuthenticatedUser } from './auth.mapper';

describe('toAuthenticatedUser', () => {
  it('copies backend permissions without reconstructing them from roles', () => {
    const response: MeUserResponse = {
      userId: 'usr_admin_owner',
      fullName: 'Admin Owner',
      email: 'admin-owner@example.com',
      platformRole: PlatformRole.ADMIN,
      permissions: [PERMISSION.PROFILE_READ],
      globalPermissions: [PERMISSION.PLACE_DELETE],
      placeMemberships: [
        {
          placeId: 'place_1',
          role: PlaceMemberRole.OWNER,
          permissions: [PERMISSION.ORDER_READ],
          effectivePermissions: [PERMISSION.PLACE_READ],
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    const user = toAuthenticatedUser(response);

    expect(user.permissions).toEqual([PERMISSION.PROFILE_READ]);
    expect(user.globalPermissions).toEqual([PERMISSION.PLACE_DELETE]);
    expect(user.placeMemberships[0]).toMatchObject({
      role: PlaceMemberRole.OWNER,
      permissions: [PERMISSION.ORDER_READ],
      effectivePermissions: [PERMISSION.PLACE_READ],
    });
    expect(user.permissions).not.toBe(response.permissions);
    expect(user.globalPermissions).not.toBe(response.globalPermissions);
    expect(user.placeMemberships[0]?.permissions).not.toBe(response.placeMemberships[0]?.permissions);
    expect(user.placeMemberships[0]?.effectivePermissions).not.toBe(response.placeMemberships[0]?.effectivePermissions);
  });

  it('fails closed when an older /me response omits global permissions', () => {
    const response: MeUserResponse = {
      userId: 'usr_legacy',
      fullName: 'Legacy User',
      email: 'legacy@example.com',
      platformRole: PlatformRole.ADMIN,
      permissions: [PERMISSION.PLACE_READ],
      placeMemberships: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    expect(toAuthenticatedUser(response).globalPermissions).toEqual([]);
  });
});
