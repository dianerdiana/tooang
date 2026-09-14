import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../auth';

export const PERMISSIONS_KEY = 'required-permissions';
export const ANY_PERMISSIONS_KEY = 'required-any-permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
