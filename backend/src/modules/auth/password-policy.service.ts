import { readFileSync } from 'node:fs';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import commonPassword from 'common-password';

import { APP_CONFIG } from '@/common/constants';

const bundledCommonPassword = commonPassword as (password: string) => boolean;
const applicationCommonPasswords = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'iloveyou',
  'admin123',
  'welcome1',
  'letmein123',
  'tooang123',
]);

export const unicodeLength = (value: string): number => Array.from(value).length;

export function assertPasswordLength(password: string): void {
  const length = unicodeLength(password);
  if (length < 8 || length > 128) {
    throw new Error('Password must contain 8 through 128 Unicode characters');
  }
}

@Injectable()
export class PasswordPolicyService {
  private readonly configuredPasswords?: ReadonlySet<string>;

  constructor(config: ConfigService = new ConfigService()) {
    const denylistPath = config.get<string>(APP_CONFIG.passwordDenylistPath);
    if (denylistPath) {
      const entries = readFileSync(denylistPath, 'utf8')
        .split(/\r?\n/)
        .filter((entry) => entry.length > 0)
        .map((entry) => entry.toLocaleLowerCase('en-US'));
      if (!entries.length) throw new Error('PASSWORD_DENYLIST_PATH contains no passwords');
      this.configuredPasswords = new Set(entries);
    }
  }

  assertAllowed(password: string): void {
    assertPasswordLength(password);
    const normalizedForLookup = password.toLocaleLowerCase('en-US');
    const denied =
      applicationCommonPasswords.has(normalizedForLookup) ||
      bundledCommonPassword(password) ||
      this.configuredPasswords?.has(normalizedForLookup) === true;
    if (denied) {
      throw new BadRequestException({
        message: 'Password is too common',
        code: 'COMMON_PASSWORD',
        details: [{ field: 'password', message: 'Choose a less common password' }],
      });
    }
  }
}
