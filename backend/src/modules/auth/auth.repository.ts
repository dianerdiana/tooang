import { Injectable } from '@nestjs/common';

import { PlatformRole, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

type DbClient = PrismaService | Prisma.TransactionClient;

export const AUTH_USER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  passwordHash: true,
  platformRole: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletionRequestedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createUser(data: { userId: string; fullName: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({
      data: { ...data, platformRole: PlatformRole.USER },
      select: AUTH_USER_SELECT,
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: AUTH_USER_SELECT });
  }

  createRefreshSession(
    data: {
      id: string;
      familyId: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    db: DbClient = this.prisma,
  ) {
    return db.refreshSession.create({ data });
  }

  findRefreshSession(tokenHash: string) {
    return this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            userId: true,
            deletedAt: true,
            deletionRequestedAt: true,
          },
        },
      },
    });
  }

  replaceRefreshSession(sessionId: string, replacedById: string, revokedAt: Date, db: DbClient) {
    return db.refreshSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
        replacedById: null,
        expiresAt: { gt: revokedAt },
      },
      data: { revokedAt, replacedById },
    });
  }

  revokeFamily(familyId: string, revokedAt: Date) {
    return this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }

  revokeByHash(tokenHash: string, revokedAt: Date) {
    return this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt },
    });
  }
}
