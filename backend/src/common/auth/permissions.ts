import type {
  PlaceMemberRole as PlaceMemberRoleType,
  PlatformRole as PlatformRoleType,
} from '@/generated/prisma/client';
import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import { isPlaceMemberRole, isPlatformRole } from './user-role.type';

export const PERMISSIONS = [
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

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
] as const satisfies readonly Permission[];

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
] as const satisfies readonly Permission[];

export const PLATFORM_PERMISSIONS = {
  [PlatformRole.USER]: SELF_SERVICE_PERMISSIONS,
  [PlatformRole.ADMIN]: ADMIN_PERMISSIONS,
  [PlatformRole.SUPER_ADMIN]: [
    ...ADMIN_PERMISSIONS,
    'owner.assign',
    'owner.revoke',
    'platform_role.assign',
    'platform_role.update',
  ],
} as const satisfies Record<PlatformRoleType, readonly Permission[]>;

export const MEMBERSHIP_PERMISSIONS = {
  [PlaceMemberRole.CASHIER]: [
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
  [PlaceMemberRole.OWNER]: [
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
} as const satisfies Record<PlaceMemberRoleType, readonly Permission[]>;

const ADMIN_GLOBAL_PERMISSIONS = [
  'order.read',
  'order.cancel',
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
  'media.upload',
  'media.delete',
] as const satisfies readonly Permission[];

export const GLOBAL_PLATFORM_PERMISSIONS = {
  [PlatformRole.USER]: [],
  [PlatformRole.ADMIN]: ADMIN_GLOBAL_PERMISSIONS,
  [PlatformRole.SUPER_ADMIN]: [
    ...ADMIN_GLOBAL_PERMISSIONS,
    'owner.assign',
    'owner.revoke',
    'platform_role.assign',
    'platform_role.update',
    'user.deactivate',
  ],
} as const satisfies Record<PlatformRoleType, readonly Permission[]>;

const EMPTY_PERMISSIONS: readonly Permission[] = Object.freeze([]);

export function getPlatformPermissions(role: unknown): readonly Permission[] {
  return isPlatformRole(role) ? PLATFORM_PERMISSIONS[role] : EMPTY_PERMISSIONS;
}

export function getMembershipPermissions(role: unknown): readonly Permission[] {
  return isPlaceMemberRole(role) ? MEMBERSHIP_PERMISSIONS[role] : EMPTY_PERMISSIONS;
}

export function hasPlatformPermission(role: unknown, permission: Permission): boolean {
  return getPlatformPermissions(role).some((candidate) => candidate === permission);
}

export function hasGlobalPlatformPermission(role: unknown, permission: Permission): boolean {
  if (!isPlatformRole(role)) return false;
  return GLOBAL_PLATFORM_PERMISSIONS[role].some((candidate) => candidate === permission);
}

export function hasMembershipPermission(role: unknown, permission: Permission): boolean {
  return getMembershipPermissions(role).some((candidate) => candidate === permission);
}

export function resolvePlacePermissions(
  platformRole: unknown,
  membershipRole: unknown,
): readonly Permission[] {
  const resolved = new Set<Permission>();
  if (isPlatformRole(platformRole)) {
    for (const permission of GLOBAL_PLATFORM_PERMISSIONS[platformRole]) resolved.add(permission);
  }
  for (const permission of getMembershipPermissions(membershipRole)) resolved.add(permission);
  return [...resolved];
}
