import { randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { BcryptHashingService, PrismaService, UserJwtService } from '../../lib';

import { AuthRepository } from './auth.repository';
import type { LoginInput, RegisterInput } from './auth.schema';
import { PasswordPolicyService } from './password-policy.service';

class RefreshReuseError extends Error {}

function publicUser(user: {
  userId: string;
  fullName: string;
  email: string;
  platformRole: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    platformRole: user.platformRole,
    ...(user.createdAt ? { createdAt: user.createdAt.toISOString() } : {}),
    ...(user.updatedAt ? { updatedAt: user.updatedAt.toISOString() } : {}),
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly hashing: BcryptHashingService,
    private readonly jwt: UserJwtService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly prisma: PrismaService,
  ) {}

  async register(input: RegisterInput) {
    this.passwordPolicy.assertAllowed(input.password);
    const passwordHash = await this.hashing.hash(input.password);
    const user = await this.repository.createUser({
      userId: `usr_${randomUUID().replaceAll('-', '')}`,
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    });
    return publicUser(user);
  }

  async login(input: LoginInput) {
    const user = await this.repository.findUserByEmail(input.email);
    const allowed =
      user &&
      !user.deletedAt &&
      !user.deletionRequestedAt &&
      (await this.hashing.compare(input.password, user.passwordHash));
    if (!allowed) throw new UnauthorizedException('Invalid email or password');

    const sessionId = randomUUID();
    const familyId = randomUUID();
    const access = await this.jwt.createAccessToken(user.userId);
    const refresh = await this.jwt.createRefreshToken(
      user.userId,
      sessionId,
      familyId,
      input.rememberMe,
    );
    await this.repository.createRefreshSession({
      id: sessionId,
      familyId,
      userId: user.id,
      tokenHash: this.hashing.hashToken(refresh.token),
      expiresAt: new Date(Date.now() + refresh.expiresIn * 1000),
    });

    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
      user: publicUser(user),
    };
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) throw new UnauthorizedException();

    const tokenHash = this.hashing.hashToken(rawToken);
    const payload = await this.jwt.verifyRefreshToken(rawToken);
    const session = await this.repository.findRefreshSession(tokenHash);
    if (
      !session ||
      session.id !== payload.sessionId ||
      session.familyId !== payload.familyId ||
      session.user.userId !== payload.userId
    ) {
      throw new UnauthorizedException();
    }

    const now = new Date();
    if (session.revokedAt || session.replacedById) {
      await this.repository.revokeFamily(session.familyId, now);
      throw new UnauthorizedException();
    }
    if (session.expiresAt <= now || session.user.deletedAt || session.user.deletionRequestedAt) {
      throw new UnauthorizedException();
    }

    const standardSeconds = this.jwt.getRefreshTokenExpiresIn(false);
    const originalSeconds = Math.round(
      (session.expiresAt.getTime() - session.createdAt.getTime()) / 1000,
    );
    const rememberMe = originalSeconds > standardSeconds;
    const replacementId = randomUUID();
    const refresh = await this.jwt.createRefreshToken(
      session.user.userId,
      replacementId,
      session.familyId,
      rememberMe,
    );

    try {
      await this.prisma.$transaction(
        async (tx) => {
          await this.repository.createRefreshSession(
            {
              id: replacementId,
              familyId: session.familyId,
              userId: session.userId,
              tokenHash: this.hashing.hashToken(refresh.token),
              expiresAt: new Date(now.getTime() + refresh.expiresIn * 1000),
            },
            tx,
          );
          const replaced = await this.repository.replaceRefreshSession(
            session.id,
            replacementId,
            now,
            tx,
          );
          if (replaced.count !== 1) throw new RefreshReuseError();
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof RefreshReuseError || this.isWriteConflict(error)) {
        await this.repository.revokeFamily(session.familyId, new Date());
        throw new UnauthorizedException();
      }
      throw error;
    }

    const access = await this.jwt.createAccessToken(session.user.userId);
    return {
      accessToken: access.token,
      expiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.repository.revokeByHash(this.hashing.hashToken(rawToken), new Date());
  }

  private isWriteConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}
