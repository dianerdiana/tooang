import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PlatformRole, Prisma } from '@/generated/prisma/client';

import {
  type AuthenticatedActor,
  getMembershipPermissions,
  getPlatformPermissions,
} from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

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
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async getMe(actor: AuthenticatedActor) {
    const user = await this.repository.findMe(actor.id);
    if (!user) throw new NotFoundException('User not found');

    return {
      ...safeUser(user),
      permissions: [...getPlatformPermissions(user.platformRole)],
      placeMemberships: user.placeMemberships.map((membership) => {
        return {
          placeId: membership.placeId,
          role: membership.role,
          permissions: [...getMembershipPermissions(membership.role)],
        };
      }),
    };
  }

  async updateMe(actor: AuthenticatedActor, input: UpdateMeInput) {
    const user = await this.repository.updateProfile(actor.id, input);
    return safeUser(user);
  }

  async requestDeletion(actor: AuthenticatedActor) {
    return this.inSerializableTransaction(async (tx) => {
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
      await this.audit.append(
        {
          actorUserId: user.id,
          action: 'ACCOUNT_DELETION_REQUESTED',
          targetType: 'User',
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
    });
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

  async updatePlatformRole(actor: AuthenticatedActor, userId: string, input: PlatformRoleInput) {
    if (actor.platformRole !== PlatformRole.SUPER_ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.inSerializableTransaction(async (tx) => {
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
      await this.audit.append(
        {
          actorUserId: actor.id,
          action: 'PLATFORM_ROLE_UPDATED',
          targetType: 'User',
          targetId: target.userId,
          beforeData: { platformRole: target.platformRole },
          afterData: { platformRole: updated.platformRole },
        },
        tx,
      );
      return safeUser(updated);
    });
  }

  async deactivate(actor: AuthenticatedActor, userId: string) {
    return this.inSerializableTransaction(async (tx) => {
      const target = await this.repository.findActiveByPublicId(userId, tx);
      if (!target) throw new NotFoundException('User not found');
      if (actor.platformRole === PlatformRole.ADMIN && target.platformRole !== PlatformRole.USER) {
        throw new ForbiddenException('ADMIN may deactivate only USER accounts');
      }
      if (
        actor.platformRole !== PlatformRole.ADMIN &&
        actor.platformRole !== PlatformRole.SUPER_ADMIN
      ) {
        throw new ForbiddenException('Insufficient permissions');
      }
      if (
        target.platformRole === PlatformRole.SUPER_ADMIN &&
        (await this.repository.countActiveSuperAdmins(tx)) <= 1
      ) {
        throw new ConflictException('The last active SUPER_ADMIN cannot be deactivated');
      }
      if (await this.repository.findSoleOwnedPlace(target.id, tx)) {
        throw new ConflictException(
          'Transfer sole place ownership before deactivating the account',
        );
      }

      const now = new Date();
      await this.repository.deactivate(target.id, now, tx);
      await this.repository.revokeSessions(target.id, now, tx);
      await this.audit.append(
        {
          actorUserId: actor.id,
          action: 'USER_DEACTIVATED',
          targetType: 'User',
          targetId: target.userId,
          beforeData: { deletedAt: null },
          afterData: { deletedAt: now.toISOString() },
        },
        tx,
      );
      return { userId: target.userId, deletedAt: now.toISOString() };
    });
  }

  private async inSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent account change; retry the request');
      }
      throw error;
    }
  }
}
