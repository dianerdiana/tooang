import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';

import { APP_CONFIG } from '../common/constants';

export function preHashPassword(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

@Injectable()
export class BcryptHashingService {
  private readonly saltRounds: number;

  constructor(configService: ConfigService) {
    const rounds = configService.get<number>(APP_CONFIG.bcryptRounds) ?? 12;
    if (!Number.isInteger(rounds) || rounds < 4 || rounds > 31) {
      throw new Error('BCRYPT_ROUNDS must be an integer between 4 and 31');
    }
    this.saltRounds = rounds;
  }

  hash(value: string): Promise<string> {
    return bcrypt.hash(preHashPassword(value), this.saltRounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(preHashPassword(plain), hashed);
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }
}
