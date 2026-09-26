import { describe, expect, it } from 'vitest';

import { PERMISSION, PERMISSIONS } from './permission.type';

const BACKEND_PERMISSION_IDENTIFIERS = [
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
  'user.create',
  'user.read',
  'user.deactivate',
  'media.upload',
  'media.delete',
] as const;

const MANAGEMENT_DASHBOARD_PERMISSIONS = [
  PERMISSION.PLACE_READ,
  PERMISSION.PLACE_CREATE,
  PERMISSION.PLACE_UPDATE,
  PERMISSION.PLACE_PUBLISH,
  PERMISSION.PLACE_DELETE,
  PERMISSION.TABLE_READ,
  PERMISSION.TABLE_CREATE,
  PERMISSION.TABLE_UPDATE,
  PERMISSION.TABLE_DELETE,
  PERMISSION.MENU_CREATE,
  PERMISSION.MENU_UPDATE,
  PERMISSION.MENU_DELETE,
  PERMISSION.ORDER_READ,
  PERMISSION.ORDER_CANCEL,
  PERMISSION.ORDER_CONFIRM,
  PERMISSION.ORDER_PREPARE,
  PERMISSION.ORDER_READY,
  PERMISSION.ORDER_COMPLETE,
  PERMISSION.PLACE_MEMBER_READ,
  PERMISSION.CASHIER_ASSIGN,
  PERMISSION.CASHIER_REVOKE,
  PERMISSION.REVIEW_MODERATE,
  PERMISSION.USER_READ,
  PERMISSION.USER_DEACTIVATE,
  PERMISSION.OWNER_ASSIGN,
  PERMISSION.OWNER_REVOKE,
  PERMISSION.PLATFORM_ROLE_ASSIGN,
  PERMISSION.PLATFORM_ROLE_UPDATE,
  PERMISSION.USER_CREATE,
  PERMISSION.MEDIA_UPLOAD,
  PERMISSION.MEDIA_DELETE,
] as const;

describe('frontend permission contract', () => {
  it('matches the backend permission identifier catalog exactly', () => {
    expect(PERMISSIONS).toEqual(BACKEND_PERMISSION_IDENTIFIERS);
  });

  it('contains unique, capability-based identifiers', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    expect(PERMISSIONS.every((permission) => /^[a-z_]+(?:\.[a-z_]+)+$/.test(permission))).toBe(true);
  });

  it('contains every permission required by the management dashboard', () => {
    expect(PERMISSIONS).toEqual(expect.arrayContaining([...MANAGEMENT_DASHBOARD_PERMISSIONS]));
  });
});
