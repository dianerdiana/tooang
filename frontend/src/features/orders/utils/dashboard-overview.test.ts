import { describe, expect, it } from 'vitest';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser, PlaceMembership } from '@/types/user-data.type';

import { combineOrderTotals, getOrderTotal, resolveOverviewOrderScope } from './dashboard-overview';

const membership = (effectivePermissions: PlaceMembership['effectivePermissions']): PlaceMembership => ({
  placeId: 'place-1',
  place: { name: 'Sate Tooang', isPublished: true, isOrderingEnabled: true },
  role: PlaceMemberRole.CASHIER,
  permissions: [...effectivePermissions],
  effectivePermissions,
});

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'user-1',
  fullName: 'Dashboard User',
  email: 'dashboard@example.com',
  platformRole: PlatformRole.USER,
  permissions: [],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('dashboard overview scope', () => {
  it('prefers an order-readable selected place over global access', () => {
    const selectedPlace = membership([PERMISSION.ORDER_READ]);
    const currentUser = user({ globalPermissions: [PERMISSION.ORDER_READ], placeMemberships: [selectedPlace] });

    expect(resolveOverviewOrderScope(currentUser, selectedPlace)).toEqual({ kind: 'place', placeId: 'place-1' });
  });

  it('uses platform scope for a global reader without a selected membership', () => {
    expect(resolveOverviewOrderScope(user({ globalPermissions: [PERMISSION.ORDER_READ] }), null)).toEqual({
      kind: 'platform',
    });
  });

  it('does not issue order requests without order.read in the current context', () => {
    expect(resolveOverviewOrderScope(user(), membership([PERMISSION.PLACE_UPDATE]))).toBeNull();
    expect(resolveOverviewOrderScope(user(), null)).toBeNull();
  });
});

describe('dashboard overview totals', () => {
  it('uses authoritative pagination totals and combines active statuses', () => {
    expect(getOrderTotal({ totalItems: 4 })).toBe(4);
    expect(combineOrderTotals(4, 6)).toBe(10);
    expect(combineOrderTotals(0, 0)).toBe(0);
  });

  it('keeps unavailable totals distinct from zero', () => {
    expect(getOrderTotal(undefined)).toBeUndefined();
    expect(combineOrderTotals(4, undefined)).toBeUndefined();
  });
});
