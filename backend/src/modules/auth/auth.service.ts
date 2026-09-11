import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma, RoleCode } from '@/generated/prisma/client';

import { UserRoleEnum } from '@/common/auth';
import { HttpResponse, toSafeUserResponse } from '@/common/responses';

import { BcryptHashingService } from '@/lib/bcrypt-hashing.service';
import { UserJwtService } from '@/lib/jwt-config.service';
import { PrismaService } from '@/lib/prisma.service';

import { AuthRepository } from './auth.repository';
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from './auth.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly prisma: PrismaService,
    private readonly hashing: BcryptHashingService,
    private readonly jwt: UserJwtService,
  ) {}

  async register(input: RegisterInput) {
    const publicUserId = `usr_${randomUUID().replaceAll('-', '')}`;
    const passwordHash = await this.hashing.hash(input.password);
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const tokens = await this.createTokenPair(
      publicUserId,
      [UserRoleEnum.User],
      sessionId,
      familyId,
    );

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const role = await this.repository.findRole(RoleCode.USER, tx);
        if (!role) throw new InternalServerErrorException('Required USER role is not seeded');

        return this.repository.createRegisteredUser(
          {
            userId: publicUserId,
            fullName: input.fullName,
            email: input.email,
            passwordHash,
            roleId: role.id,
            session: {
              id: sessionId,
              familyId,
              tokenHash: this.hashToken(tokens.refreshToken),
              expiresAt: this.expiresAt(tokens.refreshTokenExpiresIn),
            },
          },
          tx,
        );
      });

      return HttpResponse.success({
        message: 'User registered',
        data: { user: toSafeUserResponse(user), tokens },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(input: LoginInput) {
    const user = await this.repository.findActiveUserByEmail(input.email);
    const validPassword = user
      ? await this.hashing.compare(input.password, user.passwordHash)
      : await this.hashing.compare(
          input.password,
          '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid',
        );

    if (!user || !validPassword || user.roles.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = user.roles.map(({ role }) => role.code as UserRoleEnum);
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const tokens = await this.createTokenPair(user.userId, roles, sessionId, familyId);
    await this.repository.createSession({
      id: sessionId,
      familyId,
      userId: user.id,
      tokenHash: this.hashToken(tokens.refreshToken),
      expiresAt: this.expiresAt(tokens.refreshTokenExpiresIn),
    });

    return HttpResponse.success({
      message: 'Login successful',
      data: { user: toSafeUserResponse(user), tokens },
    });
  }

  async refresh(input: RefreshInput) {
    const claims = await this.jwt.verifyRefreshToken(input.refreshToken);
    const presentedHash = this.hashToken(input.refreshToken);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const session = await this.repository.findSessionById(claims.sessionId, tx);
        if (!this.sessionMatches(session, claims.userId, claims.familyId, presentedHash)) {
          return { kind: 'invalid' as const };
        }

        if (session.revokedAt) {
          await this.repository.revokeFamily(session.familyId, new Date(), tx);
          return { kind: 'invalid' as const };
        }

        if (
          session.expiresAt <= new Date() ||
          session.user.deletedAt ||
          session.user.roles.length === 0
        ) {
          await this.repository.revokeFamily(session.familyId, new Date(), tx);
          return { kind: 'invalid' as const };
        }

        const roles = session.user.roles.map(({ role }) => role.code as UserRoleEnum);
        const replacementId = randomUUID();
        const tokens = await this.createTokenPair(
          session.user.userId,
          roles,
          replacementId,
          session.familyId,
        );
        await this.repository.createSession(
          {
            id: replacementId,
            familyId: session.familyId,
            userId: session.user.id,
            tokenHash: this.hashToken(tokens.refreshToken),
            expiresAt: this.expiresAt(tokens.refreshTokenExpiresIn),
          },
          tx,
        );
        const revoked = await this.repository.revokeSessionWithReplacement(
          session.id,
          replacementId,
          new Date(),
          tx,
        );
        if (revoked.count !== 1) {
          await this.repository.revokeFamily(session.familyId, new Date(), tx);
          return { kind: 'invalid' as const };
        }

        return { kind: 'success' as const, tokens };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result.kind === 'invalid') throw new UnauthorizedException('Invalid refresh token');
    return HttpResponse.success({ message: 'Token refreshed', data: { tokens: result.tokens } });
  }

  async logout(actorUserId: string, input: LogoutInput) {
    const claims = await this.jwt.verifyRefreshToken(input.refreshToken);
    const presentedHash = this.hashToken(input.refreshToken);
    const valid = await this.prisma.$transaction(async (tx) => {
      const session = await this.repository.findSessionById(claims.sessionId, tx);
      if (
        !this.sessionMatches(session, claims.userId, claims.familyId, presentedHash) ||
        claims.userId !== actorUserId
      ) {
        return false;
      }
      await this.repository.revokeFamily(session.familyId, new Date(), tx);
      return true;
    });

    if (!valid) throw new UnauthorizedException('Invalid refresh token');
    return HttpResponse.success({ message: 'Logout successful' });
  }

  private async createTokenPair(
    userId: string,
    roles: UserRoleEnum[],
    sessionId: string,
    familyId: string,
  ) {
    const [access, refresh] = await Promise.all([
      this.jwt.createAccessToken(userId, roles),
      this.jwt.createRefreshToken(userId, sessionId, familyId),
    ]);
    return {
      tokenType: 'Bearer' as const,
      accessToken: access.token,
      accessTokenExpiresIn: access.expiresIn,
      refreshToken: refresh.token,
      refreshTokenExpiresIn: refresh.expiresIn,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashesEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private sessionMatches(
    session: Awaited<ReturnType<AuthRepository['findSessionById']>>,
    userId: string,
    familyId: string,
    tokenHash: string,
  ): session is NonNullable<typeof session> {
    return Boolean(
      session &&
      session.user.userId === userId &&
      session.familyId === familyId &&
      this.hashesEqual(session.tokenHash, tokenHash),
    );
  }

  private expiresAt(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
