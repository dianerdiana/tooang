import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { canAtPlace, cannotAtPlace, cannotPlatform, canPlatform } from './auth/has-permission';
import { createAbilityForUser, createAbilityRules } from './create-ability';

const authenticatedUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_admin_owner',
  fullName: 'Admin Owner',
  email: 'admin-owner@example.com',
  platformRole: PlatformRole.ADMIN,
  permissions: [PERMISSION.PROFILE_READ, PERMISSION.ORDER_READ],
  placeMemberships: [
    {
      placeId: 'place_one',
      role: PlaceMemberRole.OWNER,
      permissions: [PERMISSION.PLACE_UPDATE],
      effectivePermissions: [PERMISSION.PLACE_READ, PERMISSION.PLACE_READ],
    },
    {
      placeId: 'place_two',
      role: PlaceMemberRole.CASHIER,
      permissions: [PERMISSION.ORDER_CONFIRM],
      effectivePermissions: [PERMISSION.ORDER_READ, PERMISSION.ORDER_CONFIRM],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('backend-driven ability factory', () => {
  it('creates platform and place rules only from backend permission metadata', () => {
    const rules = createAbilityRules(authenticatedUser());

    expect(rules).toEqual([
      { action: PERMISSION.PROFILE_READ, subject: 'Platform' },
      { action: PERMISSION.ORDER_READ, subject: 'Platform' },
      {
        action: PERMISSION.PLACE_READ,
        subject: 'Place',
        conditions: { placeId: 'place_one' },
      },
      {
        action: PERMISSION.ORDER_READ,
        subject: 'Place',
        conditions: { placeId: 'place_two' },
      },
      {
        action: PERMISSION.ORDER_CONFIRM,
        subject: 'Place',
        conditions: { placeId: 'place_two' },
      },
    ]);
  });

  it('keeps platform and place authorization scopes separate', () => {
    const ability = createAbilityForUser(authenticatedUser());

    expect(canPlatform(ability, PERMISSION.ORDER_READ)).toBe(true);
    expect(cannotPlatform(ability, PERMISSION.PLACE_READ)).toBe(true);
    expect(canAtPlace(ability, PERMISSION.PLACE_READ, 'place_one')).toBe(true);
    expect(cannotAtPlace(ability, PERMISSION.PLACE_READ, 'place_two')).toBe(true);
    expect(cannotAtPlace(ability, PERMISSION.ORDER_READ, 'place_one')).toBe(true);
    expect(cannotAtPlace(ability, PERMISSION.ORDER_READ, 'unknown_place')).toBe(true);
  });

  it('does not infer grants from platform or membership roles', () => {
    const ability = createAbilityForUser(
      authenticatedUser({
        platformRole: PlatformRole.SUPER_ADMIN,
        permissions: [],
        placeMemberships: [
          {
            placeId: 'place_one',
            role: PlaceMemberRole.OWNER,
            permissions: [],
            effectivePermissions: [],
          },
        ],
      }),
    );

    expect(cannotPlatform(ability, PERMISSION.OWNER_ASSIGN)).toBe(true);
    expect(cannotAtPlace(ability, PERMISSION.PLACE_UPDATE, 'place_one')).toBe(true);
  });

  it('returns an empty ability when the authenticated user is cleared', () => {
    const ability = createAbilityForUser(null);

    expect(ability.rules).toEqual([]);
    expect(cannotPlatform(ability, PERMISSION.PROFILE_READ)).toBe(true);
    expect(cannotAtPlace(ability, PERMISSION.PLACE_READ, 'place_one')).toBe(true);
  });
});
