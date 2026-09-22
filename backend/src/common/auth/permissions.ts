import type {
  PlaceMemberRole as PlaceMemberRoleType,
  PlatformRole as PlatformRoleType,
} from '@/generated/prisma/client';
import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import { isPlaceMemberRole, isPlatformRole } from './user-role.type';

export const PERMISSION = {
  PROFILE_READ: 'profile.read',
  PROFILE_UPDATE: 'profile.update',
  ACCOUNT_DELETION_REQUEST: 'account.deletion.request',
  CART_MANAGE: 'cart.manage',
  ORDER_CHECKOUT: 'order.checkout',
  ORDER_READ: 'order.read',
  ORDER_CANCEL: 'order.cancel',
  ORDER_CONFIRM: 'order.confirm',
  ORDER_PREPARE: 'order.prepare',
  ORDER_READY: 'order.ready',
  ORDER_COMPLETE: 'order.complete',
  REVIEW_CREATE: 'review.create',
  REVIEW_UPDATE: 'review.update',
  REVIEW_DELETE: 'review.delete',
  REVIEW_MODERATE: 'review.moderate',
  PLACE_CREATE: 'place.create',
  PLACE_READ: 'place.read',
  PLACE_UPDATE: 'place.update',
  PLACE_PUBLISH: 'place.publish',
  PLACE_DELETE: 'place.delete',
  TABLE_READ: 'table.read',
  TABLE_CREATE: 'table.create',
  TABLE_UPDATE: 'table.update',
  TABLE_DELETE: 'table.delete',
  MENU_CREATE: 'menu.create',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',
  PLACE_MEMBER_READ: 'place_member.read',
  CASHIER_ASSIGN: 'cashier.assign',
  CASHIER_REVOKE: 'cashier.revoke',
  OWNER_ASSIGN: 'owner.assign',
  OWNER_REVOKE: 'owner.revoke',
  PLATFORM_ROLE_ASSIGN: 'platform_role.assign',
  PLATFORM_ROLE_UPDATE: 'platform_role.update',
  USER_READ: 'user.read',
  USER_DEACTIVATE: 'user.deactivate',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];
export const PERMISSIONS = Object.freeze(Object.values(PERMISSION)) as readonly Permission[];

export const PLATFORM_PERMISSION_SCOPE = {
  OWN: 'own',
  RESTRICTED: 'restricted',
  GLOBAL: 'global',
} as const;
export type PlatformPermissionScope =
  (typeof PLATFORM_PERMISSION_SCOPE)[keyof typeof PLATFORM_PERMISSION_SCOPE];

export const PLACE_PERMISSION_SCOPE = {
  MEMBER: 'member',
  OWNED: 'owned',
} as const;
export type PlacePermissionScope =
  (typeof PLACE_PERMISSION_SCOPE)[keyof typeof PLACE_PERMISSION_SCOPE];

export type PlatformGrantMap = Readonly<
  Partial<Record<Permission, readonly PlatformPermissionScope[]>>
>;
export type MembershipGrantMap = Readonly<Partial<Record<Permission, PlacePermissionScope>>>;

const OWN = Object.freeze([PLATFORM_PERMISSION_SCOPE.OWN] as const);
const RESTRICTED = Object.freeze([PLATFORM_PERMISSION_SCOPE.RESTRICTED] as const);
const GLOBAL = Object.freeze([PLATFORM_PERMISSION_SCOPE.GLOBAL] as const);
const OWN_AND_GLOBAL = Object.freeze([
  PLATFORM_PERMISSION_SCOPE.OWN,
  PLATFORM_PERMISSION_SCOPE.GLOBAL,
] as const);

const USER_PLATFORM_GRANTS = {
  [PERMISSION.PROFILE_READ]: OWN,
  [PERMISSION.PROFILE_UPDATE]: OWN,
  [PERMISSION.ACCOUNT_DELETION_REQUEST]: OWN,
  [PERMISSION.CART_MANAGE]: OWN,
  [PERMISSION.ORDER_CHECKOUT]: OWN,
  [PERMISSION.ORDER_READ]: OWN,
  [PERMISSION.ORDER_CANCEL]: OWN,
  [PERMISSION.REVIEW_CREATE]: OWN,
  [PERMISSION.REVIEW_UPDATE]: OWN,
  [PERMISSION.REVIEW_DELETE]: OWN,
} as const satisfies PlatformGrantMap;

const ADMIN_PLATFORM_GRANTS = {
  ...USER_PLATFORM_GRANTS,
  [PERMISSION.ORDER_READ]: OWN_AND_GLOBAL,
  [PERMISSION.ORDER_CANCEL]: OWN_AND_GLOBAL,
  [PERMISSION.REVIEW_MODERATE]: GLOBAL,
  [PERMISSION.PLACE_CREATE]: GLOBAL,
  [PERMISSION.PLACE_READ]: GLOBAL,
  [PERMISSION.PLACE_UPDATE]: GLOBAL,
  [PERMISSION.PLACE_PUBLISH]: GLOBAL,
  [PERMISSION.PLACE_DELETE]: GLOBAL,
  [PERMISSION.TABLE_READ]: GLOBAL,
  [PERMISSION.TABLE_CREATE]: GLOBAL,
  [PERMISSION.TABLE_UPDATE]: GLOBAL,
  [PERMISSION.TABLE_DELETE]: GLOBAL,
  [PERMISSION.MENU_CREATE]: GLOBAL,
  [PERMISSION.MENU_UPDATE]: GLOBAL,
  [PERMISSION.MENU_DELETE]: GLOBAL,
  [PERMISSION.PLACE_MEMBER_READ]: GLOBAL,
  [PERMISSION.CASHIER_ASSIGN]: GLOBAL,
  [PERMISSION.CASHIER_REVOKE]: GLOBAL,
  [PERMISSION.USER_READ]: GLOBAL,
  [PERMISSION.USER_DEACTIVATE]: RESTRICTED,
  [PERMISSION.MEDIA_UPLOAD]: GLOBAL,
  [PERMISSION.MEDIA_DELETE]: GLOBAL,
} as const satisfies PlatformGrantMap;

const SUPER_ADMIN_PLATFORM_GRANTS = {
  ...ADMIN_PLATFORM_GRANTS,
  [PERMISSION.USER_DEACTIVATE]: GLOBAL,
  [PERMISSION.OWNER_ASSIGN]: GLOBAL,
  [PERMISSION.OWNER_REVOKE]: GLOBAL,
  [PERMISSION.PLATFORM_ROLE_ASSIGN]: GLOBAL,
  [PERMISSION.PLATFORM_ROLE_UPDATE]: GLOBAL,
} as const satisfies PlatformGrantMap;

export const PLATFORM_ROLE_GRANTS = {
  [PlatformRole.USER]: USER_PLATFORM_GRANTS,
  [PlatformRole.ADMIN]: ADMIN_PLATFORM_GRANTS,
  [PlatformRole.SUPER_ADMIN]: SUPER_ADMIN_PLATFORM_GRANTS,
} as const satisfies Record<PlatformRoleType, PlatformGrantMap>;

export const PLACE_MEMBER_ROLE_GRANTS = {
  [PlaceMemberRole.CASHIER]: {
    [PERMISSION.ORDER_READ]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.ORDER_CANCEL]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.ORDER_CONFIRM]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.ORDER_PREPARE]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.ORDER_READY]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.ORDER_COMPLETE]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.PLACE_READ]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.TABLE_READ]: PLACE_PERMISSION_SCOPE.MEMBER,
    [PERMISSION.PLACE_MEMBER_READ]: PLACE_PERMISSION_SCOPE.MEMBER,
  },
  [PlaceMemberRole.OWNER]: {
    [PERMISSION.ORDER_READ]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.ORDER_CANCEL]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.ORDER_CONFIRM]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.ORDER_PREPARE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.ORDER_READY]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.ORDER_COMPLETE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.PLACE_READ]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.PLACE_UPDATE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.PLACE_PUBLISH]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.PLACE_DELETE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.TABLE_READ]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.TABLE_CREATE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.TABLE_UPDATE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.TABLE_DELETE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.MENU_CREATE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.MENU_UPDATE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.MENU_DELETE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.PLACE_MEMBER_READ]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.CASHIER_ASSIGN]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.CASHIER_REVOKE]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.MEDIA_UPLOAD]: PLACE_PERMISSION_SCOPE.OWNED,
    [PERMISSION.MEDIA_DELETE]: PLACE_PERMISSION_SCOPE.OWNED,
  },
} as const satisfies Record<PlaceMemberRoleType, MembershipGrantMap>;

const EMPTY_PERMISSIONS = Object.freeze([]) as readonly Permission[];
const EMPTY_PLATFORM_SCOPES = Object.freeze([]) as readonly PlatformPermissionScope[];
const EMPTY_MEMBERSHIP_ROLES = Object.freeze([]) as readonly PlaceMemberRoleType[];
const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);
const PLACE_CONTEXT_PERMISSION_SET: ReadonlySet<Permission> = new Set([
  ...Object.keys(PLACE_MEMBER_ROLE_GRANTS[PlaceMemberRole.CASHIER]),
  ...Object.keys(PLACE_MEMBER_ROLE_GRANTS[PlaceMemberRole.OWNER]),
  PERMISSION.REVIEW_MODERATE,
  PERMISSION.OWNER_ASSIGN,
  PERMISSION.OWNER_REVOKE,
] as Permission[]);

function permissionIds(grants: PlatformGrantMap | MembershipGrantMap): readonly Permission[] {
  return Object.freeze(PERMISSIONS.filter((permission) => grants[permission] !== undefined));
}

// Backward-compatible identifier lists derived from the scoped grant maps.
export const PLATFORM_PERMISSIONS = {
  [PlatformRole.USER]: permissionIds(PLATFORM_ROLE_GRANTS[PlatformRole.USER]),
  [PlatformRole.ADMIN]: permissionIds(PLATFORM_ROLE_GRANTS[PlatformRole.ADMIN]),
  [PlatformRole.SUPER_ADMIN]: permissionIds(PLATFORM_ROLE_GRANTS[PlatformRole.SUPER_ADMIN]),
} as const satisfies Record<PlatformRoleType, readonly Permission[]>;

export const MEMBERSHIP_PERMISSIONS = {
  [PlaceMemberRole.CASHIER]: permissionIds(PLACE_MEMBER_ROLE_GRANTS[PlaceMemberRole.CASHIER]),
  [PlaceMemberRole.OWNER]: permissionIds(PLACE_MEMBER_ROLE_GRANTS[PlaceMemberRole.OWNER]),
} as const satisfies Record<PlaceMemberRoleType, readonly Permission[]>;

export type EffectivePermissionGrant = Readonly<{
  permission: Permission;
  platformScopes: readonly PlatformPermissionScope[];
  membershipScope?: PlacePermissionScope;
}>;

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSION_SET.has(value);
}

export function getPlatformPermissionScopes(
  role: unknown,
  permission: unknown,
): readonly PlatformPermissionScope[] {
  if (!isPlatformRole(role) || !isPermission(permission)) return EMPTY_PLATFORM_SCOPES;
  const grants: PlatformGrantMap = PLATFORM_ROLE_GRANTS[role];
  return grants[permission] ?? EMPTY_PLATFORM_SCOPES;
}

export function getPlatformPermissions(role: unknown): readonly Permission[] {
  return isPlatformRole(role) ? PLATFORM_PERMISSIONS[role] : EMPTY_PERMISSIONS;
}

export function getGlobalPlatformPermissions(role: unknown): readonly Permission[] {
  if (!isPlatformRole(role)) return EMPTY_PERMISSIONS;

  return Object.freeze(
    getPlatformPermissions(role).filter((permission) =>
      getPlatformPermissionScopes(role, permission).includes(PLATFORM_PERMISSION_SCOPE.GLOBAL),
    ),
  );
}

export function getMembershipPermissionScope(
  role: unknown,
  permission: unknown,
): PlacePermissionScope | undefined {
  if (!isPlaceMemberRole(role) || !isPermission(permission)) return undefined;
  const grants: MembershipGrantMap = PLACE_MEMBER_ROLE_GRANTS[role];
  return grants[permission];
}

export function getMembershipPermissions(role: unknown): readonly Permission[] {
  return isPlaceMemberRole(role) ? MEMBERSHIP_PERMISSIONS[role] : EMPTY_PERMISSIONS;
}

/**
 * Capability identifiers effective for a target-place context. This is client
 * metadata only: resource scope and domain checks remain server-authoritative.
 */
export function getEffectivePlacePermissions(
  platformRole: unknown,
  membershipRole: unknown,
): readonly Permission[] {
  if (!isPlatformRole(platformRole) || !isPlaceMemberRole(membershipRole)) {
    return EMPTY_PERMISSIONS;
  }

  return Object.freeze(
    PERMISSIONS.filter(
      (permission) =>
        getMembershipPermissionScope(membershipRole, permission) !== undefined ||
        (PLACE_CONTEXT_PERMISSION_SET.has(permission) &&
          getPlatformPermissionScopes(platformRole, permission).includes(
            PLATFORM_PERMISSION_SCOPE.GLOBAL,
          )),
    ),
  );
}

export function getMembershipRolesForPermission(
  permission: unknown,
): readonly PlaceMemberRoleType[] {
  if (!isPermission(permission)) return EMPTY_MEMBERSHIP_ROLES;

  return Object.freeze(
    Object.values(PlaceMemberRole).filter(
      (role) => PLACE_MEMBER_ROLE_GRANTS[role][permission] !== undefined,
    ),
  );
}

export function hasPlatformPermission(role: unknown, permission: unknown): boolean {
  return getPlatformPermissionScopes(role, permission).length > 0;
}

export function hasGlobalPlatformPermission(role: unknown, permission: unknown): boolean {
  return getPlatformPermissionScopes(role, permission).includes(PLATFORM_PERMISSION_SCOPE.GLOBAL);
}

export function hasMembershipPermission(role: unknown, permission: unknown): boolean {
  return getMembershipPermissionScope(role, permission) !== undefined;
}

/**
 * Coarse endpoint admission only. A positive result does not prove that the actor
 * has a current membership for a target place.
 */
export function canAttemptPermission(platformRole: unknown, permission: unknown): boolean {
  return (
    hasPlatformPermission(platformRole, permission) ||
    getMembershipRolesForPermission(permission).length > 0
  );
}

export function resolveEffectivePermissions(
  platformRole: unknown,
  membershipRole?: unknown,
): readonly EffectivePermissionGrant[] {
  const resolved = PERMISSIONS.flatMap((permission): EffectivePermissionGrant[] => {
    const platformScopes = getPlatformPermissionScopes(platformRole, permission);
    const membershipScope = getMembershipPermissionScope(membershipRole, permission);
    if (platformScopes.length === 0 && membershipScope === undefined) return [];

    return [
      Object.freeze({
        permission,
        platformScopes,
        ...(membershipScope === undefined ? {} : { membershipScope }),
      }),
    ];
  });

  return Object.freeze(resolved);
}
