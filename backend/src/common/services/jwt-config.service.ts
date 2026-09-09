import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { isUserRoleEnum, type UserTokenPayload } from '../auth';
import { APP_CONFIG } from '../constants';

@Injectable()
export class UserJwtService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createAccessToken(payload: UserTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenExpire(),
    });
  }

  async createRefreshToken(payload: UserTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getRefreshTokenSecret(),
      expiresIn: this.getRefreshTokenExpire(),
    });
  }

  async verifyAccessToken(token: string): Promise<UserTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<object>(token, {
        secret: this.getAccessTokenSecret(),
      });

      return this.validatePayload(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException();
    }
  }

  async verifyRefreshToken(token: string): Promise<UserTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<object>(token, {
        secret: this.getRefreshTokenSecret(),
      });

      return this.validatePayload(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException();
    }
  }

  private validatePayload(payload: unknown): UserTokenPayload {
    if (typeof payload !== 'object' || payload === null) {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    const candidate = payload as Partial<UserTokenPayload>;
    const { userId, role, email, fullName } = candidate;

    if (typeof userId !== 'string' || userId.trim() === '') {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    if (!isUserRoleEnum(role)) {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    if (typeof email !== 'string' || email.trim() === '') {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    if (typeof fullName !== 'string' || fullName.trim() === '') {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    return {
      userId,
      email,
      fullName,
      role,
    };
  }

  private getAccessTokenSecret(): string {
    return this.configService.getOrThrow<string>(APP_CONFIG.jwtAccessToken);
  }

  private getAccessTokenExpire(): JwtSignOptions['expiresIn'] {
    return this.configService.getOrThrow<JwtSignOptions['expiresIn']>(
      APP_CONFIG.jwtAccessTokenExpire,
    );
  }

  private getRefreshTokenSecret(): string {
    return this.configService.getOrThrow<string>(APP_CONFIG.jwtRefreshToken);
  }

  private getRefreshTokenExpire(): JwtSignOptions['expiresIn'] {
    return this.configService.getOrThrow<JwtSignOptions['expiresIn']>(
      APP_CONFIG.jwtRefreshTokenExpire,
    );
  }
}
