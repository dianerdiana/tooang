import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION, PERMISSIONS } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { canAtPlace, cannotAtPlace, cannotPlatform, canPlatform } from './auth/has-permission';
import { createAbilityForUser, createAbilityRules } from './create-ability';

const authenticatedUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_admin_owner',
  fullName: 'Admin Owner',
  email: 'admin-owner@example.com',
  platformRole: PlatformRole.ADMIN,
  permissions: [PERMISSION.PROFILE_READ, PERMISSION.ORDER_READ],
  globalPermissions: [],
  placeMemberships: [
    {
      placeId: 'place_one',
      role: PlaceMemberRole.OWNER,
      permissions: [PERMISSION.PLACE_UPDATE],
      effectivePermissions: [PERMISSION.PLACE_READ, PERMISSION.PLACE_READ, PERMISSION.PLACE_UPDATE],
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
        action: PERMISSION.PLACE_UPDATE,
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
    expect(canAtPlace(ability, 'place_one', PERMISSION.PLACE_UPDATE)).toBe(true);
    expect(cannotAtPlace(ability, 'place_two', PERMISSION.PLACE_UPDATE)).toBe(true);
    expect(canAtPlace(ability, 'place_two', PERMISSION.ORDER_CONFIRM)).toBe(true);
    expect(cannotAtPlace(ability, 'place_one', PERMISSION.ORDER_CONFIRM)).toBe(true);
    expect(cannotAtPlace(ability, 'unknown_place', PERMISSION.ORDER_CONFIRM)).toBe(true);
  });

  it('applies global place permissions without requiring a membership', () => {
    const ability = createAbilityForUser(
      authenticatedUser({
        permissions: [PERMISSION.PLACE_UPDATE],
        globalPermissions: [PERMISSION.PLACE_UPDATE, PERMISSION.PLACE_UPDATE],
        placeMemberships: [],
      }),
    );

    expect(canAtPlace(ability, 'place_without_membership', PERMISSION.PLACE_UPDATE)).toBe(true);
    expect(ability.rules.filter(({ action }) => action === PERMISSION.PLACE_UPDATE)).toHaveLength(2);
  });

  it('does not promote a non-global platform permission to place-wide access', () => {
    const ability = createAbilityForUser(
      authenticatedUser({
        permissions: [PERMISSION.ORDER_READ],
        globalPermissions: [],
        placeMemberships: [],
      }),
    );

    expect(canPlatform(ability, PERMISSION.ORDER_READ)).toBe(true);
    expect(cannotAtPlace(ability, 'place_one', PERMISSION.ORDER_READ)).toBe(true);
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
    expect(cannotAtPlace(ability, 'place_one', PERMISSION.PLACE_UPDATE)).toBe(true);
  });

  it('returns an empty ability when the authenticated user is cleared', () => {
    const ability = createAbilityForUser(null);

    expect(ability.rules).toEqual([]);
    expect(cannotPlatform(ability, PERMISSION.PROFILE_READ)).toBe(true);
    expect(cannotAtPlace(ability, 'place_one', PERMISSION.PLACE_READ)).toBe(true);
  });

  it('keeps permission identifiers independent from place IDs', () => {
    const rules = createAbilityRules(authenticatedUser());

    expect(rules.every(({ action }) => PERMISSIONS.includes(action))).toBe(true);
    expect(rules.every(({ action }) => !action.includes('place_one'))).toBe(true);
  });
});
