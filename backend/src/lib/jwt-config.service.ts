import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import {
  isUserRoleEnumArray,
  type RefreshTokenPayload,
  type UserRoleEnum,
  type UserTokenPayload,
} from '../common/auth';
import { APP_CONFIG } from '../common/constants';

type TokenResult = { token: string; expiresIn: number };

@Injectable()
export class UserJwtService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createAccessToken(userId: string, roles: UserRoleEnum[]): Promise<TokenResult> {
    const duration = this.getDuration(APP_CONFIG.jwtAccessTokenExpire);
    const token = await this.jwtService.signAsync(
      { sub: userId, roles, tokenType: 'access' },
      { secret: this.getSecret(APP_CONFIG.jwtAccessToken), expiresIn: duration.signValue },
    );
    return { token, expiresIn: duration.seconds };
  }

  async createRefreshToken(
    userId: string,
    sessionId: string,
    familyId: string,
  ): Promise<TokenResult> {
    const duration = this.getDuration(APP_CONFIG.jwtRefreshTokenExpire);
    const token = await this.jwtService.signAsync(
      { sub: userId, sessionId, familyId, tokenType: 'refresh' },
      { secret: this.getSecret(APP_CONFIG.jwtRefreshToken), expiresIn: duration.signValue },
    );
    return { token, expiresIn: duration.seconds };
  }

  async verifyAccessToken(token: string): Promise<UserTokenPayload> {
    const payload = await this.verify(token, this.getSecret(APP_CONFIG.jwtAccessToken));
    if (payload.tokenType !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid authentication token payload');
    }
    if (!isUserRoleEnumArray(payload.roles)) {
      throw new UnauthorizedException('Invalid authentication token payload');
    }
    return { userId: payload.sub, roles: payload.roles };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    const payload = await this.verify(token, this.getSecret(APP_CONFIG.jwtRefreshToken));
    if (
      payload.tokenType !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sessionId !== 'string' ||
      typeof payload.familyId !== 'string'
    ) {
      throw new UnauthorizedException('Invalid authentication token payload');
    }
    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      familyId: payload.familyId,
    };
  }

  getRefreshTokenExpiresIn(): number {
    return this.getDuration(APP_CONFIG.jwtRefreshTokenExpire).seconds;
  }

  private async verify(token: string, secret: string): Promise<Record<string, unknown>> {
    try {
      return await this.jwtService.verifyAsync<Record<string, unknown>>(token, { secret });
    } catch {
      throw new UnauthorizedException();
    }
  }

  private getSecret(key: string): string {
    return this.configService.getOrThrow<string>(key);
  }

  private getDuration(key: string): {
    signValue: JwtSignOptions['expiresIn'];
    seconds: number;
  } {
    const raw = this.configService.getOrThrow<string | number>(key);
    if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
      return { signValue: raw, seconds: raw };
    }

    const value = String(raw).trim();
    const match = /^(\d+)([smhd])?$/.exec(value);
    if (!match) throw new Error(`Invalid JWT duration configured at ${key}`);

    const amount = Number(match[1]);
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
    const unit = (match[2] ?? 's') as keyof typeof multipliers;
    const seconds = amount * multipliers[unit];
    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
      throw new Error(`Invalid JWT duration configured at ${key}`);
    }

    return { signValue: value as JwtSignOptions['expiresIn'], seconds };
  }
}
