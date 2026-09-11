import { Injectable } from '@nestjs/common';

import { Prisma, RoleCode } from '@/generated/prisma/client';

import { PrismaService } from '@/lib/prisma.service';

export type DbClient = PrismaService | Prisma.TransactionClient;

export const authUserSelect = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  roles: { select: { role: { select: { code: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(email: string, db: DbClient = this.prisma) {
    return db.user.findFirst({ where: { email, deletedAt: null }, select: authUserSelect });
  }

  findRole(code: RoleCode, db: DbClient = this.prisma) {
    return db.role.findUnique({ where: { code }, select: { id: true, code: true } });
  }

  createRegisteredUser(
    data: {
      userId: string;
      fullName: string;
      email: string;
      passwordHash: string;
      roleId: string;
      session: { id: string; familyId: string; tokenHash: string; expiresAt: Date };
    },
    db: DbClient = this.prisma,
  ) {
    return db.user.create({
      data: {
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        roles: { create: { roleId: data.roleId } },
        refreshSessions: { create: data.session },
      },
      select: authUserSelect,
    });
  }

  createSession(
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

  findSessionById(id: string, db: DbClient = this.prisma) {
    return db.refreshSession.findUnique({
      where: { id },
      include: { user: { select: authUserSelect } },
    });
  }

  revokeSessionWithReplacement(
    id: string,
    replacedById: string,
    revokedAt: Date,
    db: DbClient = this.prisma,
  ) {
    return db.refreshSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt, replacedById },
    });
  }

  revokeFamily(familyId: string, revokedAt: Date, db: DbClient = this.prisma) {
    return db.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
