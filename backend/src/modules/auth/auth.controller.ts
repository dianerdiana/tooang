import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { Public, ZodBody } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { type LoginInput, loginSchema, type RegisterInput, registerSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { AuthRateLimit } from './auth-rate-limit';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { RefreshCookieService } from './refresh-cookie.service';

@Controller('auth')
@Public()
@UseGuards(AuthRateLimitGuard)
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly refreshCookies: RefreshCookieService,
    private readonly rateLimits: AuthRateLimitService,
  ) {}

  @Post('register')
  @AuthRateLimit('registration')
  async register(@ZodBody(registerSchema) input: RegisterInput) {
    const user = await this.service.register(input);
    return HttpResponse.success({ message: 'Registration successful', data: { user } });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('login')
  async login(
    @ZodBody(loginSchema) input: LoginInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.login(input, this.logContext(request));
    this.refreshCookies.set(response, result.rawRefreshToken, result.refreshExpiresIn);
    return HttpResponse.success({
      message: 'Login successful',
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.accessExpiresIn,
        user: result.user,
      },
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      const result = await this.service.refresh(
        this.refreshCookies.read(request),
        this.logContext(request),
      );
      this.refreshCookies.set(response, result.rawRefreshToken, result.refreshExpiresIn);
      return HttpResponse.success({
        message: 'Token refreshed',
        data: {
          accessToken: result.accessToken,
          tokenType: 'Bearer',
          expiresIn: result.accessExpiresIn,
        },
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) this.refreshCookies.clear(response);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @AuthRateLimit('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.service.logout(this.refreshCookies.read(request));
    this.refreshCookies.clear(response);
    return HttpResponse.success({ message: 'Logout successful' });
  }

  private logContext(request: Request) {
    const requestId = request.headers['x-request-id'];
    return {
      requestId: typeof requestId === 'string' ? requestId : undefined,
      sourceHash: this.rateLimits.sourceHash(
        request.ip || request.socket.remoteAddress || 'unknown',
      ),
    };
  }
}
