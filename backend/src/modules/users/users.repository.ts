import { Injectable } from '@nestjs/common';

import { PlaceMemberRole, type PlatformRole, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

import type { ListUsersInput, UpdateMeInput } from './users.schema';

type DbClient = PrismaService | Prisma.TransactionClient;

export const SAFE_USER_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  platformRole: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletionRequestedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMe(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, deletionRequestedAt: null },
      select: {
        ...SAFE_USER_SELECT,
        placeMemberships: {
          where: { revokedAt: null },
          select: { placeId: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findByInternalId(id: string, db: DbClient = this.prisma) {
    return db.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
  }

  findActiveByPublicId(userId: string, db: DbClient = this.prisma) {
    return db.user.findFirst({
      where: { userId, deletedAt: null, deletionRequestedAt: null },
      select: SAFE_USER_SELECT,
    });
  }

  updateProfile(id: string, data: UpdateMeInput) {
    return this.prisma.user.update({ where: { id }, data, select: SAFE_USER_SELECT });
  }

  async list(input: ListUsersInput) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      deletionRequestedAt: null,
      ...(input.platformRole ? { platformRole: input.platformRole } : {}),
      ...(input.search
        ? {
            OR: [
              { fullName: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [users, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: { [input.sortBy]: input.sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, totalItems };
  }

  findSoleOwnedPlace(userId: string, db: DbClient) {
    return db.place.findFirst({
      where: {
        deletedAt: null,
        AND: [
          {
            members: {
              some: { userId, role: PlaceMemberRole.OWNER, revokedAt: null },
            },
          },
          {
            members: {
              none: {
                userId: { not: userId },
                role: PlaceMemberRole.OWNER,
                revokedAt: null,
              },
            },
          },
        ],
      },
      select: { id: true },
    });
  }

  setDeletionRequested(id: string, at: Date, db: DbClient) {
    return db.user.update({
      where: { id },
      data: { deletionRequestedAt: at },
      select: SAFE_USER_SELECT,
    });
  }

  setPlatformRole(id: string, platformRole: PlatformRole, db: DbClient) {
    return db.user.update({
      where: { id },
      data: { platformRole },
      select: SAFE_USER_SELECT,
    });
  }

  deactivate(id: string, at: Date, db: DbClient) {
    return db.user.update({
      where: { id },
      data: { deletedAt: at },
      select: SAFE_USER_SELECT,
    });
  }

  revokeSessions(userId: string, at: Date, db: DbClient) {
    return db.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  countActiveSuperAdmins(db: DbClient) {
    return db.user.count({
      where: {
        platformRole: 'SUPER_ADMIN',
        deletedAt: null,
        deletionRequestedAt: null,
      },
    });
  }

  createAudit(
    data: {
      actorUserId: string;
      action: string;
      targetId: string;
      beforeData?: Prisma.InputJsonValue;
      afterData?: Prisma.InputJsonValue;
    },
    db: DbClient,
  ) {
    return db.auditLog.create({
      data: { ...data, targetType: 'User' },
    });
  }
}
