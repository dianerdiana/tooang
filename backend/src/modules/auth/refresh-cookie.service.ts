import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { CookieOptions, Request, Response } from 'express';

import { APP_CONFIG } from '@/common/constants';

const REFRESH_COOKIE_NAME = 'refresh_token';

@Injectable()
export class RefreshCookieService {
  private readonly secure: boolean;

  constructor(config: ConfigService) {
    this.secure = config.getOrThrow<boolean>(APP_CONFIG.refreshCookieSecure);
  }

  read(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    return typeof cookies?.[REFRESH_COOKIE_NAME] === 'string'
      ? cookies[REFRESH_COOKIE_NAME]
      : undefined;
  }

  set(response: Response, token: string, expiresIn: number): void {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      ...this.options(),
      maxAge: expiresIn * 1000,
    });
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.options());
  }

  options(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/api/v1/auth',
    };
  }
}
