import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticationRequest } from '@/common/auth';
import { IS_PUBLIC_KEY } from '@/common/decorators';

import { UserJwtService } from '../../lib';

import { AuthPrincipalService } from './auth-principal.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: UserJwtService,
    private readonly principals: AuthPrincipalService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticationRequest>();
    delete request.user;
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') throw new UnauthorizedException();
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw new UnauthorizedException();

    const payload = await this.jwtService.verifyAccessToken(match[1]);
    const principal = await this.principals.resolveActiveActor(payload.userId);
    if (!principal) throw new UnauthorizedException();

    request.user = principal;
    return true;
  }
}
