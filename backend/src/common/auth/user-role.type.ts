import {
  PlaceMemberRole,
  type PlaceMemberRole as PlaceMemberRoleType,
  PlatformRole,
  type PlatformRole as PlatformRoleType,
} from '@/generated/prisma/client';

export { PlaceMemberRole, PlatformRole };
export type { PlaceMemberRoleType, PlatformRoleType };

export function isPlatformRole(value: unknown): value is PlatformRoleType {
  return (
    typeof value === 'string' && Object.values(PlatformRole).includes(value as PlatformRoleType)
  );
}

export function isPlaceMemberRole(value: unknown): value is PlaceMemberRoleType {
  return (
    typeof value === 'string' &&
    Object.values(PlaceMemberRole).includes(value as PlaceMemberRoleType)
  );
}
