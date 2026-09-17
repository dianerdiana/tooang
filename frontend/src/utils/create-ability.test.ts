import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';

import { canAtPlace, canPlatform } from './auth/has-permission';
import { createAbilityForUser } from './create-ability';

const user = {
  userId: 'usr_public',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  placeMemberships: [
    {
      placeId: 'plc_one',
      role: PlaceMemberRole.OWNER,
      permissions: [PERMISSION.PLACE_UPDATE],
      effectivePermissions: [PERMISSION.PLACE_UPDATE],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('createAbilityForUser', () => {
  it('denies everything without an authenticated user', () => {
    expect(canPlatform(createAbilityForUser(null), PERMISSION.PROFILE_READ)).toBe(false);
  });

  it('keeps platform and place permissions separate', () => {
    const ability = createAbilityForUser(user);

    expect(canPlatform(ability, PERMISSION.PROFILE_READ)).toBe(true);
    expect(canPlatform(ability, PERMISSION.PLACE_UPDATE)).toBe(false);
    expect(canAtPlace(ability, PERMISSION.PLACE_UPDATE, 'plc_one')).toBe(true);
    expect(canAtPlace(ability, PERMISSION.PLACE_UPDATE, 'plc_two')).toBe(false);
  });
});
