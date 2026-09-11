import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserJwtService } from '../../lib';
import type { UserTokenPayload } from '../auth';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: UserJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: UserTokenPayload;
    }>();

    const authorization = request.headers.authorization;
    const token = Array.isArray(authorization) ? authorization[0] : authorization;

    if (!token?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const accessToken = token.slice('Bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException();
    }

    request.user = await this.jwtService.verifyAccessToken(accessToken);
    return true;
  }
}
