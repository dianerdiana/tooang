import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PlatformRole, Prisma } from '@/generated/prisma/client';

import {
  type AuthenticatedUser,
  MEMBERSHIP_PERMISSIONS,
  PlaceMemberRoleEnum,
  PLATFORM_PERMISSIONS,
  PlatformRoleEnum,
} from '@/common/auth';

import { PrismaService } from '../../lib';

import { UsersRepository } from './users.repository';
import type { ListUsersInput, PlatformRoleInput, UpdateMeInput } from './users.schema';

function safeUser(user: {
  userId: string;
  fullName: string;
  email: string;
  platformRole: PlatformRole;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    platformRole: user.platformRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getMe(actor: AuthenticatedUser) {
    const user = await this.repository.findMe(actor.id);
    if (!user) throw new NotFoundException('User not found');

    const platformRole = user.platformRole as PlatformRoleEnum;
    return {
      ...safeUser(user),
      permissions: [...PLATFORM_PERMISSIONS[platformRole]],
      placeMemberships: user.placeMemberships.map((membership) => {
        const role = membership.role as PlaceMemberRoleEnum;
        return {
          placeId: membership.placeId,
          role,
          permissions: [...MEMBERSHIP_PERMISSIONS[role]],
        };
      }),
    };
  }

  async updateMe(actor: AuthenticatedUser, input: UpdateMeInput) {
    const user = await this.repository.updateProfile(actor.id, input);
    return safeUser(user);
  }

  async requestDeletion(actor: AuthenticatedUser) {
    return this.prisma.$transaction(
      async (tx) => {
        const user = await this.repository.findByInternalId(actor.id, tx);
        if (!user || user.deletedAt) throw new NotFoundException('User not found');
        if (user.deletionRequestedAt) {
          return {
            userId: user.userId,
            status: 'DELETION_PENDING' as const,
            deletionRequestedAt: user.deletionRequestedAt.toISOString(),
          };
        }

        if (await this.repository.findSoleOwnedPlace(user.id, tx)) {
          throw new ConflictException('Transfer sole place ownership before deleting the account');
        }
        const now = new Date();
        const updated = await this.repository.setDeletionRequested(user.id, now, tx);
        await this.repository.revokeSessions(user.id, now, tx);
        await this.repository.createAudit(
          {
            actorUserId: user.id,
            action: 'ACCOUNT_DELETION_REQUESTED',
            targetId: user.userId,
            afterData: { deletionRequestedAt: now.toISOString() },
          },
          tx,
        );
        return {
          userId: updated.userId,
          status: 'DELETION_PENDING' as const,
          deletionRequestedAt: now.toISOString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async list(input: ListUsersInput) {
    const result = await this.repository.list(input);
    return {
      users: result.users.map(safeUser),
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / input.limit),
      },
    };
  }

  async get(userId: string) {
    const user = await this.repository.findActiveByPublicId(userId);
    if (!user) throw new NotFoundException('User not found');
    return safeUser(user);
  }

  async updatePlatformRole(actor: AuthenticatedUser, userId: string, input: PlatformRoleInput) {
    if (actor.platformRole !== PlatformRoleEnum.SuperAdmin) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const target = await this.repository.findActiveByPublicId(userId, tx);
        if (!target) throw new NotFoundException('User not found');
        if (target.platformRole === input.platformRole) return safeUser(target);

        if (
          target.platformRole === PlatformRole.SUPER_ADMIN &&
          input.platformRole !== PlatformRole.SUPER_ADMIN &&
          (await this.repository.countActiveSuperAdmins(tx)) <= 1
        ) {
          throw new ConflictException('The last active SUPER_ADMIN cannot be demoted');
        }

        const updated = await this.repository.setPlatformRole(target.id, input.platformRole, tx);
        await this.repository.createAudit(
          {
            actorUserId: actor.id,
            action: 'PLATFORM_ROLE_UPDATED',
            targetId: target.userId,
            beforeData: { platformRole: target.platformRole },
            afterData: { platformRole: updated.platformRole },
          },
          tx,
        );
        return safeUser(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async deactivate(actor: AuthenticatedUser, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const target = await this.repository.findActiveByPublicId(userId, tx);
        if (!target) throw new NotFoundException('User not found');
        if (
          actor.platformRole === PlatformRoleEnum.Admin &&
          target.platformRole !== PlatformRole.USER
        ) {
          throw new ForbiddenException('ADMIN may deactivate only USER accounts');
        }
        if (
          actor.platformRole !== PlatformRoleEnum.Admin &&
          actor.platformRole !== PlatformRoleEnum.SuperAdmin
        ) {
          throw new ForbiddenException('Insufficient permissions');
        }
        if (
          target.platformRole === PlatformRole.SUPER_ADMIN &&
          (await this.repository.countActiveSuperAdmins(tx)) <= 1
        ) {
          throw new ConflictException('The last active SUPER_ADMIN cannot be deactivated');
        }

        const now = new Date();
        await this.repository.deactivate(target.id, now, tx);
        await this.repository.revokeSessions(target.id, now, tx);
        await this.repository.createAudit(
          {
            actorUserId: actor.id,
            action: 'USER_DEACTIVATED',
            targetId: target.userId,
            beforeData: { deletedAt: null },
            afterData: { deletedAt: now.toISOString() },
          },
          tx,
        );
        return { userId: target.userId, deletedAt: now.toISOString() };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
