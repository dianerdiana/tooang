import { SetMetadata } from '@nestjs/common';

import type { Permission } from '../auth';

export const PERMISSIONS_KEY = 'required-permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
