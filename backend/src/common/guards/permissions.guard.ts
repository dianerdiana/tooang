import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AuthenticationRequest, canAttemptPermission, type Permission } from '../auth';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAll = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredAny = this.reflector.getAllAndOverride<Permission[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredAll?.length && !requiredAny?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticationRequest>();
    const actor = request.user;
    if (!actor) throw new UnauthorizedException();
    const canAttempt = (permission: Permission) =>
      canAttemptPermission(actor.platformRole, permission);
    if (
      (requiredAll?.length && !requiredAll.every(canAttempt)) ||
      (requiredAny?.length && !requiredAny.some(canAttempt))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
