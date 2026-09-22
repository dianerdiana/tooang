import { describe, expect, it } from 'vitest';

import { isRedirect } from '@tanstack/react-router';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import {
  canAccessPlaceDashboardRoute,
  canAccessPlatformDashboardRoute,
  requirePlaceDashboardRoute,
  requirePlatformDashboardRoute,
} from './dashboard-route-access';

const selectedPlace: PlaceMembership = {
  placeId: 'place_one',
  place: { name: 'Place One', isPublished: true, isOrderingEnabled: true },
  role: PlaceMemberRole.CASHIER,
  permissions: [PERMISSION.ORDER_READ],
  effectivePermissions: [PERMISSION.ORDER_READ],
};

const admin: AuthenticatedUser = {
  userId: 'usr_admin',
  fullName: 'Admin User',
  email: 'admin@example.com',
  platformRole: PlatformRole.ADMIN,
  permissions: [PERMISSION.ORDER_READ],
  globalPermissions: [PERMISSION.ORDER_READ],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('dashboard route access', () => {
  it('checks selected-place effective permissions independently from global permissions', () => {
    expect(canAccessPlaceDashboardRoute(selectedPlace, [PERMISSION.ORDER_READ])).toBe(true);
    expect(canAccessPlaceDashboardRoute(selectedPlace, [PERMISSION.MENU_UPDATE])).toBe(false);
    expect(canAccessPlaceDashboardRoute(null, [PERMISSION.ORDER_READ])).toBe(false);
  });

  it('checks platform routes against global permissions only', () => {
    expect(canAccessPlatformDashboardRoute(admin, [PERMISSION.ORDER_READ])).toBe(true);
    expect(canAccessPlatformDashboardRoute(admin, [PERMISSION.REVIEW_MODERATE])).toBe(false);
  });

  it('throws safe not-found redirects for denied direct route access', () => {
    for (const runGuard of [
      () => requirePlaceDashboardRoute(selectedPlace, [PERMISSION.MENU_UPDATE]),
      () => requirePlatformDashboardRoute(admin, [PERMISSION.REVIEW_MODERATE]),
    ]) {
      try {
        runGuard();
        throw new Error('Expected a redirect');
      } catch (error) {
        expect(isRedirect(error)).toBe(true);
        if (isRedirect(error)) expect(error.options).toMatchObject({ to: '/not-found', replace: true });
      }
    }
  });
});
