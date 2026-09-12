import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { jest } from '@jest/globals';

import { PLATFORM_PERMISSIONS, PlatformRoleEnum } from '@/common/auth';

import { BcryptHashingService } from '../../lib/bcrypt-hashing.service';

import { AuthRepository } from './auth.repository';
import { loginSchema, registerSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { PasswordPolicyService } from './password-policy.service';

describe('authentication contract', () => {
  const hashing = new BcryptHashingService(new ConfigService({ security: { bcryptRounds: 4 } }));

  it('normalizes registration identity fields without changing the password', () => {
    const parsed = registerSchema.parse({
      fullName: '  Dian Erdiana  ',
      email: '  DIAN@EXAMPLE.COM ',
      password: ' Exact Password ',
    });
    expect(parsed).toEqual({
      fullName: 'Dian Erdiana',
      email: 'dian@example.com',
      password: ' Exact Password ',
    });
    expect(() =>
      registerSchema.parse({
        fullName: 'Dian',
        email: 'dian@example.com',
        password: 'long-enough',
        platformRole: 'SUPER_ADMIN',
      }),
    ).toThrow();
  });

  it('keeps login passwords exact', () => {
    const parsed = loginSchema.parse({
      email: ' USER@EXAMPLE.COM ',
      password: '  not-trimmed  ',
    });
    expect(parsed.password).toBe('  not-trimmed  ');
    expect(parsed.rememberMe).toBe(false);
  });

  it('pre-hashes all password bytes before bcrypt', async () => {
    const hash = await hashing.hash('a'.repeat(128));
    await expect(hashing.compare('a'.repeat(128), hash)).resolves.toBe(true);
    await expect(hashing.compare(`${'a'.repeat(127)}b`, hash)).resolves.toBe(false);
  });

  it('rejects configured common passwords case-insensitively', () => {
    const policy = new PasswordPolicyService();
    expect(() => policy.assertAllowed('PASSWORD123')).toThrow();
    expect(() => policy.assertAllowed('a-unique-passphrase')).not.toThrow();
  });

  it('maps USER permissions without administrative capabilities', () => {
    expect(PLATFORM_PERMISSIONS[PlatformRoleEnum.User]).toContain('profile.read');
    expect(PLATFORM_PERMISSIONS[PlatformRoleEnum.User]).not.toContain('user.read');
  });

  it('revokes a refresh family when a rotated token is reused', async () => {
    const repository = {
      findRefreshSession: jest.fn(() =>
        Promise.resolve({
          id: 'session-1',
          familyId: 'family-1',
          userId: 'db-user-1',
          tokenHash: hashing.hashToken('raw-token'),
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date(),
          revokedAt: new Date(),
          replacedById: 'session-2',
          user: {
            userId: 'usr_1',
            deletedAt: null,
            deletionRequestedAt: null,
          },
        }),
      ),
      revokeFamily: jest.fn(() => Promise.resolve({ count: 1 })),
    } as unknown as AuthRepository;
    const jwt = {
      verifyRefreshToken: jest.fn(() =>
        Promise.resolve({
          userId: 'usr_1',
          sessionId: 'session-1',
          familyId: 'family-1',
        }),
      ),
    };
    const service = new AuthService(
      repository,
      hashing,
      jwt as never,
      new PasswordPolicyService(),
      {} as never,
    );

    await expect(service.refresh('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect((repository.revokeFamily as jest.Mock).mock.calls[0][0]).toBe('family-1');
  });
});
