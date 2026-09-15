import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AccessTokenPayload, AuthenticationRequest } from '@/common/auth';
import { IS_PUBLIC_KEY } from '@/common/decorators';

import { UserJwtService } from '../../lib';
import { WinstonLoggerService } from '../../lib/winston-logger.service';
import { OperationalMetricsService } from '../observability/operational-metrics.service';

import { AuthPrincipalService } from './auth-principal.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: UserJwtService,
    private readonly principals: AuthPrincipalService,
    @Optional() private readonly logger?: WinstonLoggerService,
    @Optional() private readonly metrics?: OperationalMetricsService,
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
    if (typeof authorization !== 'string') return this.reject('missing_authorization');
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) return this.reject('malformed_authorization');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAccessToken(match[1]);
    } catch {
      return this.reject('invalid_access_token');
    }
    const principal = await this.principals.resolveActiveActor(payload.userId);
    if (!principal) return this.reject('inactive_actor');

    request.user = principal;
    return true;
  }

  private reject(category: string): never {
    this.logger?.warn('Authentication failed', { event: 'auth.failure', category });
    this.metrics?.increment('auth_failures_total', { outcome: category });
    throw new UnauthorizedException();
  }
}
