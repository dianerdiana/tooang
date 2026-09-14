import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AuthenticatedUser, hasPlatformPermission, type Permission } from '../auth';
import { PERMISSIONS_KEY } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (
      !request.user ||
      !required.every((permission) => hasPlatformPermission(request.user?.platformRole, permission))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
