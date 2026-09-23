import { describe, expect, it } from 'vitest';

import { buildDashboardNavigation } from '@/configs/dashboard-navigation';

import { createAbilityForUser } from '@/utils/create-ability';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION, type PermissionIdentifier } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import { canAccessDashboard } from './dashboard-access';
import { canAtPlace, canPlatform } from './has-permission';

const membership = (
  placeId: string,
  role: PlaceMemberRole,
  effectivePermissions: PermissionIdentifier[],
): PlaceMembership => ({
  placeId,
  place: { name: `${role} Place`, isPublished: true, isOrderingEnabled: true },
  role,
  permissions: [...effectivePermissions],
  effectivePermissions,
});

const backendUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_authorization',
  fullName: 'Authorization User',
  email: 'authorization@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const labels = (user: AuthenticatedUser, selectedPlace: PlaceMembership | null, group: string) =>
  buildDashboardNavigation({ user, selectedPlace })
    .find((entry) => entry.id === group)
    ?.items.map((item) => item.label) ?? [];

describe('backend-driven authorization scenarios', () => {
  it('denies a plain USER management access', () => {
    expect(canAccessDashboard(backendUser())).toBe(false);
  });

  it('allows CASHIER operational UI without configuration actions', () => {
    const cashier = membership('place-cashier', PlaceMemberRole.CASHIER, [
      PERMISSION.ORDER_READ,
      PERMISSION.ORDER_CONFIRM,
      PERMISSION.TABLE_READ,
      PERMISSION.TABLE_UPDATE,
    ]);
    const user = backendUser({ placeMemberships: [cashier] });
    const ability = createAbilityForUser(user);

    expect(canAccessDashboard(user)).toBe(true);
    expect(labels(user, cashier, 'place')).toEqual(['Orders', 'Dining Tables']);
    expect(canAtPlace(ability, cashier.placeId, PERMISSION.ORDER_CONFIRM)).toBe(true);
    expect(canAtPlace(ability, cashier.placeId, PERMISSION.TABLE_UPDATE)).toBe(true);
    expect(canAtPlace(ability, cashier.placeId, PERMISSION.MENU_UPDATE)).toBe(false);
    expect(canAtPlace(ability, cashier.placeId, PERMISSION.PLACE_UPDATE)).toBe(false);
  });

  it('allows OWNER place management without platform administration', () => {
    const owner = membership('place-owner', PlaceMemberRole.OWNER, [
      PERMISSION.PLACE_UPDATE,
      PERMISSION.PLACE_PUBLISH,
      PERMISSION.MENU_UPDATE,
      PERMISSION.CASHIER_ASSIGN,
    ]);
    const user = backendUser({ placeMemberships: [owner] });
    const ability = createAbilityForUser(user);

    expect(labels(user, owner, 'place')).toEqual(['Menu', 'Business Hours', 'Members', 'Settings']);
    expect(labels(user, owner, 'platform')).toEqual([]);
    expect(canAtPlace(ability, owner.placeId, PERMISSION.MENU_UPDATE)).toBe(true);
    expect(canPlatform(ability, PERMISSION.USER_READ)).toBe(false);
  });

  it('uses ADMIN metadata without inferring SUPER_ADMIN operations', () => {
    const user = backendUser({
      platformRole: PlatformRole.ADMIN,
      permissions: [PERMISSION.PROFILE_READ, PERMISSION.USER_READ],
      globalPermissions: [
        PERMISSION.PLACE_READ,
        PERMISSION.ORDER_READ,
        PERMISSION.REVIEW_MODERATE,
        PERMISSION.USER_READ,
      ],
    });
    const ability = createAbilityForUser(user);

    expect(labels(user, null, 'platform')).toEqual(['Places', 'Orders', 'Reviews', 'Users']);
    expect(canPlatform(ability, PERMISSION.USER_READ)).toBe(true);
    expect(canPlatform(ability, PERMISSION.PLATFORM_ROLE_UPDATE)).toBe(false);
    expect(canAtPlace(ability, 'any-place', PERMISSION.OWNER_ASSIGN)).toBe(false);
  });

  it('shows SUPER_ADMIN role and OWNER operations only when metadata grants them', () => {
    const user = backendUser({
      platformRole: PlatformRole.SUPER_ADMIN,
      permissions: [PERMISSION.PROFILE_READ, PERMISSION.PLATFORM_ROLE_UPDATE],
      globalPermissions: [PERMISSION.USER_READ, PERMISSION.PLATFORM_ROLE_UPDATE, PERMISSION.OWNER_ASSIGN],
    });
    const ability = createAbilityForUser(user);

    expect(canPlatform(ability, PERMISSION.PLATFORM_ROLE_UPDATE)).toBe(true);
    expect(canAtPlace(ability, 'any-place', PERMISSION.OWNER_ASSIGN)).toBe(true);
  });

  it('changes scoped capabilities when the active membership changes', () => {
    const cashier = membership('place-cashier', PlaceMemberRole.CASHIER, [PERMISSION.ORDER_READ]);
    const owner = membership('place-owner', PlaceMemberRole.OWNER, [PERMISSION.MENU_UPDATE, PERMISSION.PLACE_UPDATE]);
    const user = backendUser({ placeMemberships: [cashier, owner] });
    const ability = createAbilityForUser(user);

    expect(labels(user, cashier, 'place')).toEqual(['Orders']);
    expect(labels(user, owner, 'place')).toEqual(['Menu', 'Business Hours', 'Settings']);
    expect(canAtPlace(ability, cashier.placeId, PERMISSION.MENU_UPDATE)).toBe(false);
    expect(canAtPlace(ability, owner.placeId, PERMISSION.MENU_UPDATE)).toBe(true);
  });
});
