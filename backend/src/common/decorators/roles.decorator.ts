import { SetMetadata } from '@nestjs/common';

import type { UserRoleEnum } from '../auth';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoleEnum[]) => SetMetadata(ROLES_KEY, roles);
