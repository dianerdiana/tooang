import { Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';

import type { Request, Response } from 'express';

import { APP_CONFIG } from '@/common/constants';
import { Public, ZodBody } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { type LoginInput, loginSchema, type RegisterInput, registerSchema } from './auth.schema';
import { AuthService } from './auth.service';

const COOKIE_NAME = 'refresh_token';

@Controller('auth')
@Public()
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @SkipThrottle({ loginShort: true, loginLong: true, refresh: true, logout: true })
  async register(@ZodBody(registerSchema) input: RegisterInput) {
    const user = await this.service.register(input);
    return HttpResponse.success({ message: 'Registration successful', data: { user } });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ registration: true, refresh: true, logout: true })
  async login(
    @ZodBody(loginSchema) input: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.login(input);
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresIn);
    return HttpResponse.success({
      message: 'Login successful',
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
        user: result.user,
      },
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ loginShort: true, loginLong: true, registration: true, logout: true })
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.service.refresh(this.refreshCookie(request));
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresIn);
    return HttpResponse.success({
      message: 'Token refreshed',
      data: {
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      },
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle({ loginShort: true, loginLong: true, registration: true, refresh: true })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.service.logout(this.refreshCookie(request));
    response.clearCookie(COOKIE_NAME, this.cookieOptions());
    return HttpResponse.success({ message: 'Logout successful' });
  }

  private refreshCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    return typeof cookies?.[COOKIE_NAME] === 'string' ? cookies[COOKIE_NAME] : undefined;
  }

  private setRefreshCookie(response: Response, token: string, expiresIn: number): void {
    response.cookie(COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: expiresIn * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.get<string>(APP_CONFIG.nodeEnv) === 'production',
      path: '/api/v1/auth',
    };
  }
}
