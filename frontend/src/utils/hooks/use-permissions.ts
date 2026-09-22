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
    (placeId: string, permission: PermissionIdentifier) => checkCanAtPlace(ability, placeId, permission),
    [ability],
  );
  const cannotAtPlace = useCallback(
    (placeId: string, permission: PermissionIdentifier) => checkCannotAtPlace(ability, placeId, permission),
    [ability],
  );

  return useMemo(() => ({ can, cannot, canAtPlace, cannotAtPlace }), [can, cannot, canAtPlace, cannotAtPlace]);
};
