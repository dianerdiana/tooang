import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRoleEnum, UserTokenPayload } from '../auth';
import { ROLES_KEY } from '../decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleEnum[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: UserTokenPayload }>();
    if (!request.user || !requiredRoles.some((role) => request.user?.roles.includes(role))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
