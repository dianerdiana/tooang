import { PlaceMemberRoleEnum, PlatformRoleEnum } from './user-role.type';

const SELF_SERVICE_PERMISSIONS = [
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
] as const;

const ADMIN_PERMISSIONS = [
  ...SELF_SERVICE_PERMISSIONS,
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
] as const;

export const PLATFORM_PERMISSIONS = {
  [PlatformRoleEnum.User]: SELF_SERVICE_PERMISSIONS,
  [PlatformRoleEnum.Admin]: ADMIN_PERMISSIONS,
  [PlatformRoleEnum.SuperAdmin]: [
    ...ADMIN_PERMISSIONS,
    'owner.assign',
    'owner.revoke',
    'platform_role.assign',
    'platform_role.update',
  ],
} as const;

export const MEMBERSHIP_PERMISSIONS = {
  [PlaceMemberRoleEnum.Cashier]: [
    'order.read',
    'order.cancel',
    'order.confirm',
    'order.prepare',
    'order.ready',
    'order.complete',
    'place.read',
    'table.read',
    'place_member.read',
  ],
  [PlaceMemberRoleEnum.Owner]: [
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
  ],
} as const;

export type Permission =
  | (typeof PLATFORM_PERMISSIONS)[PlatformRoleEnum][number]
  | (typeof MEMBERSHIP_PERMISSIONS)[PlaceMemberRoleEnum][number];
