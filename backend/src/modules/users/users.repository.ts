import { Injectable } from '@nestjs/common';

import { PlaceMemberRole, type PlatformRole, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

import type { ListUsersInput, UpdateMeInput } from './users.schema';

type DbClient = PrismaService | Prisma.TransactionClient;

export const USER_RESPONSE_SELECT = {
  userId: true,
  fullName: true,
  email: true,
  platformRole: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const USER_LIFECYCLE_SELECT = {
  id: true,
  ...USER_RESPONSE_SELECT,
  deletedAt: true,
  deletionRequestedAt: true,
  anonymizedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: {
      userId: string;
      fullName: string;
      email: string;
      passwordHash: string;
      platformRole: PlatformRole;
    },
    db: DbClient,
  ) {
    return db.user.create({ data, select: USER_RESPONSE_SELECT });
  }

  findMe(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      select: {
        ...USER_RESPONSE_SELECT,
        placeMemberships: {
          where: { revokedAt: null, place: { deletedAt: null } },
          select: {
            placeId: true,
            role: true,
            place: {
              select: {
                name: true,
                isPublished: true,
                isOrderingEnabled: true,
              },
            },
          },
          orderBy: [{ place: { name: 'asc' } }, { placeId: 'asc' }],
        },
      },
    });
  }

  findByInternalId(id: string, db: DbClient = this.prisma) {
    return db.user.findUnique({ where: { id }, select: USER_LIFECYCLE_SELECT });
  }

  findActiveByPublicId(userId: string, db: DbClient = this.prisma) {
    return db.user.findFirst({
      where: { userId, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      select: USER_LIFECYCLE_SELECT,
    });
  }

  updateProfile(id: string, data: UpdateMeInput) {
    return this.prisma.user.update({
      where: { id, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      data,
      select: USER_RESPONSE_SELECT,
    });
  }

  async list(input: ListUsersInput) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      deletionRequestedAt: null,
      anonymizedAt: null,
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
        select: USER_RESPONSE_SELECT,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy: [{ [input.sortBy]: input.sortOrder }, { userId: 'asc' }],
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
                user: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
  }

  setDeletionRequestedIfActive(id: string, at: Date, db: DbClient) {
    return db.user.updateMany({
      where: { id, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      data: { deletionRequestedAt: at },
    });
  }

  setPlatformRole(id: string, platformRole: PlatformRole, db: DbClient) {
    return db.user.update({
      where: { id },
      data: { platformRole },
      select: USER_LIFECYCLE_SELECT,
    });
  }

  deactivate(id: string, at: Date, db: DbClient) {
    return db.user.update({
      where: { id },
      data: { deletedAt: at },
      select: USER_LIFECYCLE_SELECT,
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
        anonymizedAt: null,
      },
    });
  }
}
