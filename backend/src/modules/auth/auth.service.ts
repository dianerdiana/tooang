import { randomUUID } from 'node:crypto';

import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';

import { type PlatformRole, Prisma } from '@/generated/prisma/client';

import {
  BcryptHashingService,
  PrismaService,
  UserJwtService,
  WinstonLoggerService,
} from '../../lib';

import { AuthRepository } from './auth.repository';
import type { LoginInput, RegisterInput } from './auth.schema';
import { PasswordPolicyService } from './password-policy.service';

class RefreshReuseError extends Error {}
type AuthLogContext = { requestId?: string; sourceHash?: string };

function publicUser(user: {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
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
    @Optional() private readonly logger?: WinstonLoggerService,
  ) {}

  async register(input: RegisterInput) {
    this.passwordPolicy.assertAllowed(input.password);
    const passwordHash = await this.hashing.hashPassword(input.password);
    const user = await this.prisma.$transaction((tx) =>
      this.repository.createUser(
        {
          userId: `usr_${randomUUID().replaceAll('-', '')}`,
          fullName: input.fullName,
          email: input.email,
          passwordHash,
        },
        tx,
      ),
    );
    return publicUser(user);
  }

  async login(input: LoginInput, logContext: AuthLogContext = {}) {
    const user = await this.repository.findUserByEmail(input.email);
    const passwordMatches = await this.hashing.verifyPasswordOrDummy(
      input.password,
      user?.passwordHash,
    );
    const allowed =
      user && !user.deletedAt && !user.deletionRequestedAt && !user.anonymizedAt && passwordMatches;
    if (!allowed) {
      this.logger?.warn('Authentication login failed', {
        event: 'auth.login.failed',
        ...logContext,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

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
      tokenHash: this.hashing.hashRefreshToken(refresh.token),
      expiresAt: new Date(Date.now() + refresh.expiresIn * 1000),
    });

    return {
      accessToken: access.token,
      accessExpiresIn: access.expiresIn,
      rawRefreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
      user: publicUser(user),
    };
  }

  async refresh(rawToken: string | undefined, logContext: AuthLogContext = {}) {
    if (!rawToken) throw new UnauthorizedException();

    const tokenHash = this.hashing.hashRefreshToken(rawToken);
    const session = await this.repository.findRefreshSession(tokenHash);
    if (!session) throw new UnauthorizedException();
    if (session.revokedAt || session.replacedById) {
      await this.revokeReusedFamily(session.familyId, logContext);
      throw new UnauthorizedException();
    }

    const payload = await this.jwt.verifyRefreshToken(rawToken);
    if (
      session.id !== payload.sessionId ||
      session.familyId !== payload.familyId ||
      session.user.userId !== payload.userId
    ) {
      throw new UnauthorizedException();
    }

    const now = new Date();
    if (
      session.expiresAt <= now ||
      session.user.deletedAt ||
      session.user.deletionRequestedAt ||
      session.user.anonymizedAt
    ) {
      if (session.user.deletedAt || session.user.deletionRequestedAt || session.user.anonymizedAt) {
        await this.repository.revokeFamily(session.familyId, now);
      }
      throw new UnauthorizedException();
    }

    const rememberMe =
      payload.sessionMode === 'remember' ||
      (payload.sessionMode === undefined &&
        Math.round((session.expiresAt.getTime() - session.createdAt.getTime()) / 1000) >
          this.jwt.getRefreshTokenExpiresIn(false));
    const replacementId = randomUUID();
    const refresh = await this.jwt.createRefreshToken(
      session.user.userId,
      replacementId,
      session.familyId,
      rememberMe,
    );

    try {
      await this.rotateSession(
        session.id,
        session.familyId,
        session.userId,
        replacementId,
        refresh.token,
        refresh.expiresIn,
        now,
      );
    } catch (error) {
      if (error instanceof RefreshReuseError) {
        await this.revokeReusedFamily(session.familyId, logContext);
        throw new UnauthorizedException();
      }
      throw error;
    }

    const access = await this.jwt.createAccessToken(session.user.userId);
    return {
      accessToken: access.token,
      accessExpiresIn: access.expiresIn,
      rawRefreshToken: refresh.token,
      refreshExpiresIn: refresh.expiresIn,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.repository.revokeByHash(this.hashing.hashRefreshToken(rawToken), new Date());
  }

  private async rotateSession(
    sessionId: string,
    familyId: string,
    userId: string,
    replacementId: string,
    rawReplacementToken: string,
    refreshExpiresIn: number,
    now: Date,
    attempt = 0,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const consumed = await this.repository.consumeRefreshSession(sessionId, now, tx);
          if (consumed.count !== 1) throw new RefreshReuseError();
          await this.repository.createRefreshSession(
            {
              id: replacementId,
              familyId,
              userId,
              tokenHash: this.hashing.hashRefreshToken(rawReplacementToken),
              expiresAt: new Date(now.getTime() + refreshExpiresIn * 1000),
            },
            tx,
          );
          await this.repository.linkRefreshReplacement(sessionId, replacementId, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (this.isWriteConflict(error) && attempt === 0) {
        const current = await this.repository.findRefreshSession(
          this.hashing.hashRefreshToken(rawReplacementToken),
        );
        if (!current) {
          return this.rotateSession(
            sessionId,
            familyId,
            userId,
            replacementId,
            rawReplacementToken,
            refreshExpiresIn,
            now,
            1,
          );
        }
      }
      throw error;
    }
  }

  private async revokeReusedFamily(
    familyId: string,
    logContext: AuthLogContext = {},
  ): Promise<void> {
    await this.repository.revokeFamily(familyId, new Date());
    this.logger?.warn('Authentication refresh-token reuse detected', {
      event: 'auth.refresh.reuse',
      ...logContext,
    });
  }

  private isWriteConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }
}
