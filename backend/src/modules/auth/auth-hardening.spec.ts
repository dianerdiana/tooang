import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { jest } from '@jest/globals';

import { PlatformRole } from '@/generated/prisma/client';

import { BcryptHashingService, preHashPassword } from '../../lib';

import { AuthRepository } from './auth.repository';
import { registerSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { PasswordPolicyService } from './password-policy.service';

describe('authentication hardening', () => {
  it('counts Unicode code points and preserves exact password normalization forms', () => {
    expect(() =>
      registerSchema.parse({ fullName: 'User', email: 'u@example.com', password: '😀'.repeat(7) }),
    ).toThrow();
    expect(
      registerSchema.parse({ fullName: 'User', email: 'u@example.com', password: '😀'.repeat(8) })
        .password,
    ).toBe('😀'.repeat(8));
    expect(preHashPassword('é-password')).not.toBe(preHashPassword('e\u0301-password'));
  });

  it('uses dummy bcrypt verification for an unknown email', async () => {
    const repository = { findUserByEmail: jest.fn(() => Promise.resolve(null)) };
    const hashing = {
      verifyPasswordOrDummy: jest.fn(() => Promise.resolve(false)),
    };
    const service = new AuthService(
      repository as unknown as AuthRepository,
      hashing as never,
      {} as never,
      new PasswordPolicyService(),
      {} as never,
    );

    await expect(
      service.login({ email: 'missing@example.com', password: 'anything', rememberMe: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(hashing.verifyPasswordOrDummy).toHaveBeenCalledWith('anything', undefined);
  });

  it('hashes before and creates the explicit USER inside the service transaction', async () => {
    const tx = { marker: 'transaction-client' };
    const repository = {
      createUser: jest.fn((_data: unknown, db: unknown) =>
        Promise.resolve({
          userId: 'usr_1',
          fullName: 'User',
          email: 'user@example.com',
          platformRole: PlatformRole.USER,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          db,
        }),
      ),
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: object) => unknown) => callback(tx)),
    };
    const hashing = { hashPassword: jest.fn(() => Promise.resolve('stored-hash')) };
    const policy = { assertAllowed: jest.fn() };
    const service = new AuthService(
      repository as unknown as AuthRepository,
      hashing as unknown as BcryptHashingService,
      {} as never,
      policy,
      prisma as never,
    );

    const result = await service.register({
      fullName: 'User',
      email: 'user@example.com',
      password: 'unique password',
    });
    expect(hashing.hashPassword.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createUser.mock.invocationCallOrder[0],
    );
    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'stored-hash' }),
      tx,
    );
    expect(result).toEqual(
      expect.objectContaining({ platformRole: PlatformRole.USER, email: 'user@example.com' }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('uses a 43-character bcrypt-safe SHA-256 representation and all input bytes', async () => {
    expect(preHashPassword('exact password')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const hashing = new BcryptHashingService(new ConfigService({ security: { bcryptRounds: 4 } }));
    const first = `${'😀'.repeat(40)}A`;
    const second = `${'😀'.repeat(40)}B`;
    const hash = await hashing.hashPassword(first);
    await expect(hashing.verifyPassword(first, hash)).resolves.toBe(true);
    await expect(hashing.verifyPassword(second, hash)).resolves.toBe(false);
  });

  it('consumes the parent before creating and linking a refresh replacement', async () => {
    const now = new Date();
    const repository = {
      findRefreshSession: jest.fn(() =>
        Promise.resolve({
          id: 'session-1',
          familyId: 'family-1',
          userId: 'database-user-1',
          expiresAt: new Date(now.getTime() + 86_400_000),
          revokedAt: null,
          replacedById: null,
          createdAt: now,
          user: {
            userId: 'usr_1',
            deletedAt: null,
            deletionRequestedAt: null,
            anonymizedAt: null,
          },
        }),
      ),
      consumeRefreshSession: jest.fn(() => Promise.resolve({ count: 1 })),
      createRefreshSession: jest.fn(() => Promise.resolve({})),
      linkRefreshReplacement: jest.fn(() => Promise.resolve({})),
    };
    const jwt = {
      verifyRefreshToken: jest.fn(() =>
        Promise.resolve({
          userId: 'usr_1',
          sessionId: 'session-1',
          familyId: 'family-1',
          sessionMode: 'standard',
        }),
      ),
      createRefreshToken: jest.fn(() => Promise.resolve({ token: 'replacement', expiresIn: 30 })),
      createAccessToken: jest.fn(() => Promise.resolve({ token: 'access', expiresIn: 900 })),
      getRefreshTokenExpiresIn: jest.fn(() => 30),
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: object) => unknown) => callback({ transaction: true })),
    };
    const hashing = {
      hashRefreshToken: jest.fn((value: string) => `hash:${value}`),
    };
    const service = new AuthService(
      repository as unknown as AuthRepository,
      hashing as unknown as BcryptHashingService,
      jwt as never,
      new PasswordPolicyService(),
      prisma as never,
    );

    await expect(service.refresh('original')).resolves.toEqual(
      expect.objectContaining({
        accessToken: 'access',
        accessExpiresIn: 900,
        rawRefreshToken: 'replacement',
      }),
    );
    expect(repository.consumeRefreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createRefreshSession.mock.invocationCallOrder[0],
    );
    expect(repository.createRefreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      repository.linkRefreshReplacement.mock.invocationCallOrder[0],
    );
  });
});
