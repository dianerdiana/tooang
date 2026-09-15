import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Request, Response } from 'express';

import type { AuthenticationRequest } from '@/common/auth';

import { AUTH_RATE_LIMIT_KEY, type AuthRateLimitPolicy } from './auth-rate-limit';
import { AuthRateLimitService } from './auth-rate-limit.service';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimits: AuthRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<AuthRateLimitPolicy>(AUTH_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!policy) return true;

    const request = context.switchToHttp().getRequest<AuthenticationRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const retryAfter = await this.rateLimits.consume(
      policy,
      this.source(policy, request),
      this.requestId(request),
    );
    if (!retryAfter) return true;

    response.setHeader('Retry-After', String(retryAfter));
    throw new HttpException(
      { message: 'Too many requests; try again later', code: 'TOO_MANY_REQUESTS' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private source(policy: AuthRateLimitPolicy, request: AuthenticationRequest): string {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    return policy === 'order-code-lookup' ? `${request.user?.id ?? 'anonymous'}:${ip}` : ip;
  }

  private requestId(request: Request): string | undefined {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' ? value : undefined;
  }
}
