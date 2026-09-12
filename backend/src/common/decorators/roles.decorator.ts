import { SetMetadata } from '@nestjs/common';

import type { PlatformRoleEnum } from '../auth';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: PlatformRoleEnum[]) => SetMetadata(ROLES_KEY, roles);
