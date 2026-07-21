import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION, type PermissionIdentifier } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import { buildDashboardNavigation } from './dashboard-navigation';

const membership = (
  placeId: string,
  name: string,
  role: PlaceMemberRole,
  effectivePermissions: PermissionIdentifier[],
): PlaceMembership => ({
  placeId,
  place: { name, isPublished: true, isOrderingEnabled: true },
  role,
  permissions: [...effectivePermissions],
  effectivePermissions,
});

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_navigation',
  fullName: 'Navigation User',
  email: 'navigation@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const itemLabels = (navigation: ReturnType<typeof buildDashboardNavigation>, groupId: string) =>
  navigation.find((group) => group.id === groupId)?.items.map((item) => item.label) ?? [];

describe('buildDashboardNavigation', () => {
  it('shows only operational place navigation for a cashier', () => {
    const selectedPlace = membership('place_cashier', 'Cashier Place', PlaceMemberRole.CASHIER, [
      PERMISSION.ORDER_READ,
      PERMISSION.ORDER_CONFIRM,
      PERMISSION.PLACE_READ,
      PERMISSION.TABLE_READ,
      PERMISSION.PLACE_MEMBER_READ,
    ]);
    const navigation = buildDashboardNavigation({ user: user({ placeMemberships: [selectedPlace] }), selectedPlace });

    expect(itemLabels(navigation, 'place')).toEqual(['Orders', 'Dining Tables', 'Business Hours', 'Members']);
    expect(itemLabels(navigation, 'platform')).toEqual([]);
  });

  it('shows place management navigation from owner capabilities', () => {
    const selectedPlace = membership('place_owner', 'Owner Place', PlaceMemberRole.OWNER, [
      PERMISSION.ORDER_READ,
      PERMISSION.MENU_UPDATE,
      PERMISSION.TABLE_READ,
      PERMISSION.PLACE_UPDATE,
      PERMISSION.CASHIER_ASSIGN,
      PERMISSION.MEDIA_UPLOAD,
    ]);
    const navigation = buildDashboardNavigation({ user: user({ placeMemberships: [selectedPlace] }), selectedPlace });

    expect(itemLabels(navigation, 'place')).toEqual([
      'Orders',
      'Menu',
      'Dining Tables',
      'Business Hours',
      'Members',
      'Settings',
    ]);
  });

  it('uses global capabilities for platform navigation without a membership', () => {
    const navigation = buildDashboardNavigation({
      user: user({
        platformRole: PlatformRole.ADMIN,
        globalPermissions: [
          PERMISSION.PLACE_READ,
          PERMISSION.ORDER_READ,
          PERMISSION.REVIEW_MODERATE,
          PERMISSION.USER_READ,
        ],
      }),
      selectedPlace: null,
    });

    expect(itemLabels(navigation, 'place')).toEqual([]);
    expect(itemLabels(navigation, 'platform')).toEqual(['Places', 'Orders', 'Reviews', 'Users']);
  });

  it('updates place navigation and link search when the selected membership changes', () => {
    const cashier = membership('place_cashier', 'Cashier Place', PlaceMemberRole.CASHIER, [PERMISSION.ORDER_READ]);
    const owner = membership('place_owner', 'Owner Place', PlaceMemberRole.OWNER, [PERMISSION.MENU_UPDATE]);
    const currentUser = user({ placeMemberships: [cashier, owner] });

    const cashierNavigation = buildDashboardNavigation({ user: currentUser, selectedPlace: cashier });
    const ownerNavigation = buildDashboardNavigation({ user: currentUser, selectedPlace: owner });

    expect(itemLabels(cashierNavigation, 'place')).toEqual(['Orders']);
    expect(itemLabels(ownerNavigation, 'place')).toEqual(['Menu']);
    expect(
      ownerNavigation.flatMap((group) => group.items).every((item) => item.search?.placeId === 'place_owner'),
    ).toBe(true);
  });
});
