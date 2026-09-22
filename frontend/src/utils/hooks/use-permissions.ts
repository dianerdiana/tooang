import { useCallback, useMemo } from 'react';

import {
  canAtPlace as checkCanAtPlace,
  cannotAtPlace as checkCannotAtPlace,
  cannotPlatform,
  canPlatform,
} from '@/utils/auth/has-permission';

import type { PermissionIdentifier } from '@/types/permission.type';

import { useAppAbility } from './use-app-ability';

export const usePermissions = () => {
  const ability = useAppAbility();

  const can = useCallback((permission: PermissionIdentifier) => canPlatform(ability, permission), [ability]);
  const cannot = useCallback((permission: PermissionIdentifier) => cannotPlatform(ability, permission), [ability]);
  const canAtPlace = useCallback(
    (permission: PermissionIdentifier, placeId: string) => checkCanAtPlace(ability, permission, placeId),
    [ability],
  );
  const cannotAtPlace = useCallback(
    (permission: PermissionIdentifier, placeId: string) => checkCannotAtPlace(ability, permission, placeId),
    [ability],
  );

  return useMemo(() => ({ can, cannot, canAtPlace, cannotAtPlace }), [can, cannot, canAtPlace, cannotAtPlace]);
};
