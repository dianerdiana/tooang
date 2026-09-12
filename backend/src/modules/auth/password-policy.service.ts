import { BadRequestException, Injectable } from '@nestjs/common';

const COMMON_PASSWORDS = new Set([
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

@Injectable()
export class PasswordPolicyService {
  assertAllowed(password: string): void {
    if (COMMON_PASSWORDS.has(password.toLocaleLowerCase('en-US'))) {
      throw new BadRequestException({
        message: 'Password is too common',
        code: 'COMMON_PASSWORD',
        details: [{ field: 'password', message: 'Choose a less common password' }],
      });
    }
  }
}
