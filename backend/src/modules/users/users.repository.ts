import { Injectable } from '@nestjs/common';

import { Prisma, RoleCode } from '@/generated/prisma/client';

import { PrismaService } from '@/lib/prisma.service';

export type UsersDbClient = PrismaService | Prisma.TransactionClient;

export const safeUserSelect = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  roles: { select: { role: { select: { code: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByPublicId(userId: string, db: UsersDbClient = this.prisma) {
    return db.user.findFirst({ where: { userId, deletedAt: null }, select: safeUserSelect });
  }

  updateProfile(
    id: string,
    data: { fullName?: string; email?: string },
    db: UsersDbClient = this.prisma,
  ) {
    return db.user.update({ where: { id }, data, select: safeUserSelect });
  }

  listActive(
    args: {
      page: number;
      limit: number;
      search?: string;
      column: 'createdAt' | 'fullName' | 'email';
      sort: 'asc' | 'desc';
    },
    db: UsersDbClient = this.prisma,
  ) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(args.search
        ? {
            OR: [
              { fullName: { contains: args.search, mode: Prisma.QueryMode.insensitive } },
              { email: { contains: args.search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    return Promise.all([
      db.user.findMany({
        where,
        select: safeUserSelect,
        skip: (args.page - 1) * args.limit,
        take: args.limit,
        orderBy: { [args.column]: args.sort },
      }),
      db.user.count({ where }),
    ]);
  }

  findRole(code: RoleCode, db: UsersDbClient = this.prisma) {
    return db.role.findUnique({ where: { code }, select: { id: true, code: true } });
  }

  findRoleAssignment(userId: string, roleId: string, db: UsersDbClient = this.prisma) {
    return db.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
      select: { userId: true, roleId: true },
    });
  }

  assignRole(userId: string, roleId: string, db: UsersDbClient = this.prisma) {
    return db.userRole.create({ data: { userId, roleId } });
  }

  revokeRole(userId: string, roleId: string, db: UsersDbClient = this.prisma) {
    return db.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
  }

  countRoles(userId: string, db: UsersDbClient = this.prisma) {
    return db.userRole.count({ where: { userId } });
  }

  countOwnerRelationships(userId: string, db: UsersDbClient = this.prisma) {
    return db.placeOwner.count({ where: { userId } });
  }

  findPlaceWithoutAlternateOwner(userId: string, db: UsersDbClient = this.prisma) {
    return db.placeOwner.findFirst({
      where: {
        userId,
        place: {
          deletedAt: null,
          owners: {
            none: { userId: { not: userId }, user: { deletedAt: null } },
          },
        },
      },
      select: { place: { select: { id: true, name: true } } },
    });
  }

  countActiveSuperAdmins(db: UsersDbClient = this.prisma) {
    return db.user.count({
      where: {
        deletedAt: null,
        roles: { some: { role: { code: RoleCode.SUPER_ADMIN } } },
      },
    });
  }

  removeOwnerships(userId: string, db: UsersDbClient = this.prisma) {
    return db.placeOwner.deleteMany({ where: { userId } });
  }

  deactivateUser(id: string, deletedAt: Date, db: UsersDbClient = this.prisma) {
    return db.user.update({ where: { id }, data: { deletedAt }, select: safeUserSelect });
  }

  revokeAllSessions(userId: string, revokedAt: Date, db: UsersDbClient = this.prisma) {
    return db.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }

  createAudit(
    data: {
      actorUserId: string;
      action: string;
      targetType: string;
      targetId: string;
      beforeData?: Prisma.InputJsonValue;
      afterData?: Prisma.InputJsonValue;
    },
    db: UsersDbClient = this.prisma,
  ) {
    return db.auditLog.create({ data });
  }
}
