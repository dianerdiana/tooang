import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import {
  getMembershipPermissions,
  getMembershipPermissionScope,
  getPlatformPermissions,
  getPlatformPermissionScopes,
  hasGlobalPlatformPermission,
  hasMembershipPermission,
  hasPlatformPermission,
  isPermission,
  MEMBERSHIP_PERMISSIONS,
  PERMISSION,
  PERMISSIONS,
  PLACE_MEMBER_ROLE_GRANTS,
  PLACE_PERMISSION_SCOPE,
  PLATFORM_PERMISSION_SCOPE,
  PLATFORM_PERMISSIONS,
  PLATFORM_ROLE_GRANTS,
  resolveEffectivePermissions,
} from './permissions';

describe('SRS v1.3 permission contract', () => {
  it('defines a stable, unique, capability-based identifier list', () => {
    expect(PERMISSIONS).toEqual([
      'profile.read',
      'profile.update',
      'account.deletion.request',
      'cart.manage',
      'order.checkout',
      'order.read',
      'order.cancel',
      'order.confirm',
      'order.prepare',
      'order.ready',
      'order.complete',
      'review.create',
      'review.update',
      'review.delete',
      'review.moderate',
      'place.create',
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
      'owner.assign',
      'owner.revoke',
      'platform_role.assign',
      'platform_role.update',
      'user.read',
      'user.deactivate',
      'media.upload',
      'media.delete',
    ]);
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    expect(PERMISSIONS.every((permission) => /^[a-z_]+(?:\.[a-z_]+)+$/.test(permission))).toBe(
      true,
    );
    expect(PERMISSIONS.every((permission) => !/[0-9]/.test(permission))).toBe(true);
    expect(isPermission(PERMISSION.ORDER_READ)).toBe(true);
    expect(isPermission('order.read.place-123')).toBe(false);
    expect(isPermission(null)).toBe(false);
  });

  it('maps every supported role and no unknown role', () => {
    expect(Object.keys(PLATFORM_ROLE_GRANTS).sort()).toEqual(Object.values(PlatformRole).sort());
    expect(Object.keys(PLACE_MEMBER_ROLE_GRANTS).sort()).toEqual(
      Object.values(PlaceMemberRole).sort(),
    );
    expect(getPlatformPermissions('OWNER')).toEqual([]);
    expect(getMembershipPermissions('ADMIN')).toEqual([]);
  });

  it('defines the exact USER platform allowlist at own scope', () => {
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
    ]);
    for (const permission of PLATFORM_PERMISSIONS[PlatformRole.USER]) {
      expect(getPlatformPermissionScopes(PlatformRole.USER, permission)).toEqual(['own']);
    }
    expect(hasPlatformPermission(PlatformRole.USER, PERMISSION.PLACE_READ)).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, PERMISSION.TABLE_READ)).toBe(false);
    expect(hasPlatformPermission(PlatformRole.USER, PERMISSION.PLACE_MEMBER_READ)).toBe(false);
    expect(hasGlobalPlatformPermission(PlatformRole.USER, PERMISSION.ORDER_READ)).toBe(false);
  });

  it('defines ADMIN global and restricted grants without security administration', () => {
    expect(PLATFORM_PERMISSIONS[PlatformRole.ADMIN]).toEqual([
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
      'review.moderate',
      'place.create',
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
      'user.read',
      'user.deactivate',
      'media.upload',
      'media.delete',
    ]);
    expect(getPlatformPermissionScopes(PlatformRole.ADMIN, PERMISSION.ORDER_READ)).toEqual([
      'own',
      'global',
    ]);
    expect(getPlatformPermissionScopes(PlatformRole.ADMIN, PERMISSION.ORDER_CANCEL)).toEqual([
      'own',
      'global',
    ]);
    expect(getPlatformPermissionScopes(PlatformRole.ADMIN, PERMISSION.USER_DEACTIVATE)).toEqual([
      'restricted',
    ]);
    for (const permission of [
      PERMISSION.REVIEW_MODERATE,
      PERMISSION.PLACE_CREATE,
      PERMISSION.PLACE_UPDATE,
      PERMISSION.TABLE_CREATE,
      PERMISSION.MENU_CREATE,
      PERMISSION.PLACE_MEMBER_READ,
      PERMISSION.CASHIER_ASSIGN,
      PERMISSION.USER_READ,
      PERMISSION.MEDIA_UPLOAD,
    ]) {
      expect(hasGlobalPlatformPermission(PlatformRole.ADMIN, permission)).toBe(true);
    }
    expect(hasGlobalPlatformPermission(PlatformRole.ADMIN, PERMISSION.USER_DEACTIVATE)).toBe(false);
    expect(hasPlatformPermission(PlatformRole.ADMIN, PERMISSION.OWNER_ASSIGN)).toBe(false);
    expect(hasPlatformPermission(PlatformRole.ADMIN, PERMISSION.PLATFORM_ROLE_UPDATE)).toBe(false);
    expect(hasGlobalPlatformPermission(PlatformRole.ADMIN, PERMISSION.ORDER_CONFIRM)).toBe(false);
  });

  it('defines SUPER_ADMIN global security and ownership administration', () => {
    expect(PLATFORM_PERMISSIONS[PlatformRole.SUPER_ADMIN]).toEqual([
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
      'review.moderate',
      'place.create',
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
      'owner.assign',
      'owner.revoke',
      'platform_role.assign',
      'platform_role.update',
      'user.read',
      'user.deactivate',
      'media.upload',
      'media.delete',
    ]);
    for (const permission of [
      PERMISSION.USER_DEACTIVATE,
      PERMISSION.OWNER_ASSIGN,
      PERMISSION.OWNER_REVOKE,
      PERMISSION.PLATFORM_ROLE_ASSIGN,
      PERMISSION.PLATFORM_ROLE_UPDATE,
    ]) {
      expect(getPlatformPermissionScopes(PlatformRole.SUPER_ADMIN, permission)).toEqual(['global']);
    }
    expect(hasGlobalPlatformPermission(PlatformRole.SUPER_ADMIN, PERMISSION.ORDER_CONFIRM)).toBe(
      false,
    );
  });

  it('defines the exact CASHIER membership allowlist at member scope', () => {
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
    for (const permission of MEMBERSHIP_PERMISSIONS[PlaceMemberRole.CASHIER]) {
      expect(getMembershipPermissionScope(PlaceMemberRole.CASHIER, permission)).toBe(
        PLACE_PERMISSION_SCOPE.MEMBER,
      );
    }
    expect(hasMembershipPermission(PlaceMemberRole.CASHIER, PERMISSION.PLACE_UPDATE)).toBe(false);
  });

  it('defines OWNER management at owned scope without platform or OWNER administration', () => {
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
    for (const permission of MEMBERSHIP_PERMISSIONS[PlaceMemberRole.OWNER]) {
      expect(getMembershipPermissionScope(PlaceMemberRole.OWNER, permission)).toBe(
        PLACE_PERMISSION_SCOPE.OWNED,
      );
    }
    expect(hasMembershipPermission(PlaceMemberRole.OWNER, PERMISSION.OWNER_ASSIGN)).toBe(false);
    expect(hasMembershipPermission(PlaceMemberRole.OWNER, PERMISSION.USER_READ)).toBe(false);
  });

  it('combines platform and membership grants additively without losing scope', () => {
    const adminOwner = resolveEffectivePermissions(PlatformRole.ADMIN, PlaceMemberRole.OWNER);
    expect(adminOwner.filter(({ permission }) => permission === PERMISSION.PLACE_UPDATE)).toEqual([
      {
        permission: 'place.update',
        platformScopes: ['global'],
        membershipScope: 'owned',
      },
    ]);
    expect(adminOwner.filter(({ permission }) => permission === PERMISSION.ORDER_CONFIRM)).toEqual([
      {
        permission: 'order.confirm',
        platformScopes: [],
        membershipScope: 'owned',
      },
    ]);

    const userCashier = resolveEffectivePermissions(PlatformRole.USER, PlaceMemberRole.CASHIER);
    expect(userCashier.filter(({ permission }) => permission === PERMISSION.ORDER_READ)).toEqual([
      {
        permission: 'order.read',
        platformScopes: ['own'],
        membershipScope: 'member',
      },
    ]);
    expect(new Set(userCashier.map(({ permission }) => permission)).size).toBe(userCashier.length);
  });

  it('keeps platform authority and membership independent', () => {
    const ownerOnly = resolveEffectivePermissions(undefined, PlaceMemberRole.OWNER);
    expect(ownerOnly.some(({ permission }) => permission === PERMISSION.PLACE_UPDATE)).toBe(true);
    expect(ownerOnly.some(({ permission }) => permission === PERMISSION.USER_READ)).toBe(false);

    const superAdminOnly = resolveEffectivePermissions(PlatformRole.SUPER_ADMIN);
    expect(superAdminOnly.find(({ permission }) => permission === PERMISSION.OWNER_ASSIGN)).toEqual(
      {
        permission: 'owner.assign',
        platformScopes: ['global'],
      },
    );
    expect(superAdminOnly.some(({ permission }) => permission === PERMISSION.ORDER_CONFIRM)).toBe(
      false,
    );
  });

  it('defaults unknown roles and permissions to denial', () => {
    expect(getPlatformPermissionScopes('UNKNOWN', PERMISSION.USER_READ)).toEqual([]);
    expect(getPlatformPermissionScopes(PlatformRole.ADMIN, 'unknown.permission')).toEqual([]);
    expect(getMembershipPermissionScope(undefined, PERMISSION.ORDER_READ)).toBeUndefined();
    expect(
      getMembershipPermissionScope(PlaceMemberRole.OWNER, 'unknown.permission'),
    ).toBeUndefined();
    expect(hasPlatformPermission('UNKNOWN', PERMISSION.USER_READ)).toBe(false);
    expect(hasMembershipPermission(undefined, PERMISSION.ORDER_READ)).toBe(false);
    expect(hasGlobalPlatformPermission(null, PERMISSION.PLACE_READ)).toBe(false);
    expect(resolveEffectivePermissions('UNKNOWN', 'UNKNOWN')).toEqual([]);
    expect(PLATFORM_PERMISSION_SCOPE.RESTRICTED).toBe('restricted');
  });
});
