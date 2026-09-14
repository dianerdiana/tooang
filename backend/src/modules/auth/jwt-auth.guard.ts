import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AuthenticatedUser } from '@/common/auth';
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

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;
    const header = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedException();

    const payload = await this.jwtService.verifyAccessToken(token);
    const principal = await this.principals.resolve(payload.userId);
    if (!principal) throw new UnauthorizedException();

    request.user = principal;
    return true;
  }
}
