import { createHash } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { UserRoleEnum } from '@/common/auth';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'internal-user',
    userId: 'usr_123',
    fullName: 'Dian Erdiana',
    email: 'dian@example.com',
    passwordHash: 'hash',
    createdAt: new Date('2026-09-11T00:00:00Z'),
    updatedAt: new Date('2026-09-11T00:00:00Z'),
    deletedAt: null,
    roles: [{ role: { code: 'USER' } }],
  };

  it('uses the same unauthorized outcome for an unknown account', async () => {
    const repository = { findActiveUserByEmail: jest.fn().mockResolvedValue(null as never) };
    const hashing = { compare: jest.fn().mockResolvedValue(false as never) };
    const service = new AuthService(
      repository as never,
      {} as never,
      hashing as never,
      {} as never,
    );
    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(hashing.compare).toHaveBeenCalled();
  });

  it('returns safe user data and persists a hashed refresh session on login', async () => {
    const repository = {
      findActiveUserByEmail: jest.fn().mockResolvedValue(user as never),
      createSession: jest.fn().mockResolvedValue({} as never),
    };
    const hashing = { compare: jest.fn().mockResolvedValue(true as never) };
    const jwt = {
      createAccessToken: jest.fn().mockResolvedValue({ token: 'access', expiresIn: 900 } as never),
      createRefreshToken: jest
        .fn()
        .mockResolvedValue({ token: 'refresh', expiresIn: 604800 } as never),
    };
    const service = new AuthService(
      repository as never,
      {} as never,
      hashing as never,
      jwt as never,
    );
    const response = await service.login({ email: user.email, password: 'secret' });
    expect(response.data?.user).not.toHaveProperty('passwordHash');
    expect(response.data?.user.roles).toEqual([UserRoleEnum.User]);
    expect(repository.createSession).toHaveBeenCalled();
    const persisted = repository.createSession.mock.calls[0][0] as {
      tokenHash: string;
    };
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('revokes a token family when a rotated refresh token is reused', async () => {
    const rawToken = 'signed-refresh-token';
    const repository = {
      findSessionById: jest.fn().mockResolvedValue({
        id: 'session',
        familyId: 'family',
        tokenHash: createHash('sha256').update(rawToken).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        user,
      } as never),
      revokeFamily: jest.fn().mockResolvedValue({ count: 1 } as never),
    };
    const prisma = { $transaction: (work: (tx: object) => unknown) => work({}) };
    const jwt = {
      verifyRefreshToken: jest.fn().mockResolvedValue({
        userId: user.userId,
        sessionId: 'session',
        familyId: 'family',
      } as never),
    };
    const service = new AuthService(
      repository as never,
      prisma as never,
      {} as never,
      jwt as never,
    );

    await expect(service.refresh({ refreshToken: rawToken })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.revokeFamily).toHaveBeenCalledWith('family', expect.any(Date), {});
  });
});
