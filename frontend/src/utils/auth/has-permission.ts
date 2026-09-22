import type { AppAbility, PlaceSubject } from '@/types/ability-rule.type';
import type { PermissionIdentifier } from '@/types/permission.type';

export const canPlatform = (ability: AppAbility, permission: PermissionIdentifier) =>
  ability.can(permission, 'Platform');

export const cannotPlatform = (ability: AppAbility, permission: PermissionIdentifier) =>
  ability.cannot(permission, 'Platform');

export const canAtPlace = (ability: AppAbility, permission: PermissionIdentifier, placeId: string) =>
  ability.can(permission, { type: 'Place', placeId } as PlaceSubject);

export const cannotAtPlace = (ability: AppAbility, permission: PermissionIdentifier, placeId: string) =>
  ability.cannot(permission, { type: 'Place', placeId } as PlaceSubject);
