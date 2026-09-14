import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

import { APP_CONFIG } from '../common/constants';

export function preHashPassword(value: string): string {
  return createHash('sha256').update(Buffer.from(value, 'utf8')).digest('base64url');
}

@Injectable()
export class BcryptHashingService {
  private readonly saltRounds: number;
  private readonly dummyHash: Promise<string>;

  constructor(configService: ConfigService) {
    const rounds = configService.get<number>(APP_CONFIG.bcryptRounds) ?? 12;
    if (!Number.isInteger(rounds) || rounds < 4 || rounds > 31) {
      throw new Error('BCRYPT_ROUNDS must be an integer between 4 and 31');
    }
    this.saltRounds = rounds;
    this.dummyHash = bcrypt.hash(preHashPassword('tooang-dummy-password-never-valid'), rounds);
  }

  hashPassword(value: string): Promise<string> {
    return bcrypt.hash(preHashPassword(value), this.saltRounds);
  }

  verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(preHashPassword(plain), hashed);
  }

  async verifyPasswordOrDummy(plain: string, hashed?: string): Promise<boolean> {
    return this.verifyPassword(plain, hashed ?? (await this.dummyHash));
  }

  hashRefreshToken(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  // Compatibility aliases for callers outside AuthModule while the names migrate.
  hash(value: string): Promise<string> {
    return this.hashPassword(value);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return this.verifyPassword(plain, hashed);
  }

  hashToken(value: string): string {
    return this.hashRefreshToken(value);
  }
}
