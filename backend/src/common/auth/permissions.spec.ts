import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import {
  getMembershipPermissions,
  getPlatformPermissions,
  hasGlobalPlatformPermission,
  hasMembershipPermission,
  hasPlatformPermission,
  MEMBERSHIP_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  resolvePlacePermissions,
} from './permissions';

describe('SRS v1.3 permission matrix', () => {
  it('defines the exact USER platform allowlist', () => {
    expect(PLATFORM_PERMISSIONS[PlatformRole.USER]).toEqual([
      'profile.read',
      'profile.update',
      'account.deletion.request',
      'cart.manage',
      'order.checkout',
      'order.read',
      'order.cancel',
      'review.create',
      'review.update',
      'review.delete',
      'place.read',
      'table.read',
      'place_member.read',
    ]);
  });

  it('adds only approved ADMIN and SUPER_ADMIN permissions', () => {
    expect(PLATFORM_PERMISSIONS[PlatformRole.ADMIN]).toEqual([
      ...PLATFORM_PERMISSIONS[PlatformRole.USER],
      'review.moderate',
      'place.create',
      'place.update',
      'place.publish',
      'place.delete',
      'table.create',
      'table.update',
      'table.delete',
      'menu.create',
      'menu.update',
      'menu.delete',
      'cashier.assign',
      'cashier.revoke',
      'user.read',
      'user.deactivate',
      'media.upload',
      'media.delete',
    ]);
    expect(PLATFORM_PERMISSIONS[PlatformRole.SUPER_ADMIN]).toEqual([
      ...PLATFORM_PERMISSIONS[PlatformRole.ADMIN],
      'owner.assign',
      'owner.revoke',
      'platform_role.assign',
      'platform_role.update',
    ]);
  });

  it('defines the exact CASHIER membership allowlist', () => {
    expect(MEMBERSHIP_PERMISSIONS[PlaceMemberRole.CASHIER]).toEqual([
      'order.read',
      'order.cancel',
      'order.confirm',
      'order.prepare',
      'order.ready',
      'order.complete',
      'place.read',
      'table.read',
      'place_member.read',
    ]);
    expect(hasMembershipPermission(PlaceMemberRole.CASHIER, 'place.update')).toBe(false);
  });

  it('defines OWNER management permissions without platform authority', () => {
    expect(MEMBERSHIP_PERMISSIONS[PlaceMemberRole.OWNER]).toEqual([
      'order.read',
      'order.cancel',
      'order.confirm',
      'order.prepare',
      'order.ready',
      'order.complete',
      'place.read',
      'place.update',
      'place.publish',
      'place.delete',
      'table.read',
      'table.create',
      'table.update',
      'table.delete',
      'menu.create',
      'menu.update',
      'menu.delete',
      'place_member.read',
      'cashier.assign',
      'cashier.revoke',
      'media.upload',
      'media.delete',
    ]);
    expect(hasMembershipPermission(PlaceMemberRole.OWNER, 'owner.assign')).toBe(false);
    expect(hasMembershipPermission(PlaceMemberRole.OWNER, 'user.read')).toBe(false);
  });

  it('resolves global and membership permissions additively without inferring roles', () => {
    const resolved = resolvePlacePermissions(PlatformRole.ADMIN, PlaceMemberRole.OWNER);
    expect(resolved).toEqual(expect.arrayContaining(['place.update', 'order.confirm']));
    expect(hasGlobalPlatformPermission(PlatformRole.ADMIN, 'order.confirm')).toBe(false);
    expect(hasGlobalPlatformPermission(PlatformRole.SUPER_ADMIN, 'owner.assign')).toBe(true);
  });

  it('defaults unknown roles to denial', () => {
    expect(getPlatformPermissions('OWNER')).toEqual([]);
    expect(getMembershipPermissions('ADMIN')).toEqual([]);
    expect(hasPlatformPermission('UNKNOWN', 'user.read')).toBe(false);
    expect(hasMembershipPermission(undefined, 'order.read')).toBe(false);
    expect(hasGlobalPlatformPermission(null, 'place.read')).toBe(false);
  });
});
