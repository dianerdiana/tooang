import type { AppAbility, PlaceSubject } from '@/types/ability-rule.type';
import type { Permission } from '@/types/permission.type';

export const canPlatform = (ability: AppAbility, permission: Permission) => ability.can(permission, 'Platform');

export const canAtPlace = (ability: AppAbility, permission: Permission, placeId: string) =>
  ability.can(permission, { type: 'Place', placeId } as PlaceSubject);
