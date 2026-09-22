import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { canAccessDashboard, getDashboardAccessRedirect } from './dashboard-access';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_1',
  fullName: 'Dashboard User',
  email: 'dashboard@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ, PERMISSION.ORDER_READ],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('dashboard access', () => {
  it.each([
    {
      label: 'USER with an OWNER capability',
      value: user({
        placeMemberships: [
          {
            placeId: 'place_owner',
            place: { name: 'Owner Place', isPublished: true, isOrderingEnabled: true },
            role: PlaceMemberRole.OWNER,
            permissions: [PERMISSION.PLACE_UPDATE],
            effectivePermissions: [PERMISSION.PLACE_UPDATE],
          },
        ],
      }),
    },
    {
      label: 'USER with a CASHIER capability',
      value: user({
        placeMemberships: [
          {
            placeId: 'place_cashier',
            place: { name: 'Cashier Place', isPublished: true, isOrderingEnabled: true },
            role: PlaceMemberRole.CASHIER,
            permissions: [PERMISSION.ORDER_CONFIRM],
            effectivePermissions: [PERMISSION.ORDER_CONFIRM],
          },
        ],
      }),
    },
    {
      label: 'ADMIN with a global capability and no membership',
      value: user({
        platformRole: PlatformRole.ADMIN,
        globalPermissions: [PERMISSION.PLACE_READ],
      }),
    },
    {
      label: 'SUPER_ADMIN with a global capability and no membership',
      value: user({
        platformRole: PlatformRole.SUPER_ADMIN,
        globalPermissions: [PERMISSION.OWNER_ASSIGN],
      }),
    },
  ])('allows $label', ({ value }) => {
    expect(canAccessDashboard(value)).toBe(true);
  });

  it.each([
    { label: 'no user', value: null },
    { label: 'plain USER with own-scope permissions', value: user() },
    {
      label: 'membership without effective capabilities',
      value: user({
        placeMemberships: [
          {
            placeId: 'place_empty',
            place: { name: 'Empty Place', isPublished: false, isOrderingEnabled: false },
            role: PlaceMemberRole.CASHIER,
            permissions: [PERMISSION.ORDER_CONFIRM],
            effectivePermissions: [],
          },
        ],
      }),
    },
  ])('denies $label', ({ value }) => {
    expect(canAccessDashboard(value)).toBe(false);
  });

  it('redirects unauthenticated direct access to login with a safe return path', () => {
    expect(getDashboardAccessRedirect({ isAuthenticated: false, user: null }, '/dashboard?tab=orders')).toEqual({
      to: '/login',
      search: { redirect: '/dashboard?tab=orders' },
      replace: true,
    });
  });

  it('sanitizes an unsafe unauthenticated return path', () => {
    expect(getDashboardAccessRedirect({ isAuthenticated: false, user: null }, 'https://evil.example')).toEqual({
      to: '/login',
      search: { redirect: '/' },
      replace: true,
    });
  });

  it('redirects an authenticated user without management capabilities to home', () => {
    expect(getDashboardAccessRedirect({ isAuthenticated: true, user: user() }, '/dashboard')).toEqual({
      to: '/',
      replace: true,
    });
  });

  it('allows direct access when capability metadata is sufficient', () => {
    const admin = user({ globalPermissions: [PERMISSION.PLACE_READ] });

    expect(getDashboardAccessRedirect({ isAuthenticated: true, user: admin }, '/dashboard')).toBeNull();
  });
});
