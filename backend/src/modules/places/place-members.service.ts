import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PlaceMemberRole, Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION, type Permission } from '@/common/auth';
import { isTransactionWriteConflict } from '@/common/errors';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import { PlaceAccessService } from './place-access.service';
import { PlacesRepository } from './places.repository';

@Injectable()
export class PlaceMembersService {
  constructor(
    private readonly repository: PlacesRepository,
    private readonly access: PlaceAccessService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async list(actor: AuthenticatedActor, placeId: string) {
    const access = await this.access.assertPermission(actor, placeId, PERMISSION.PLACE_MEMBER_READ);
    const onlyUserId =
      access.source === 'membership' && access.membershipRole === PlaceMemberRole.CASHIER
        ? actor.id
        : undefined;
    const members = await this.repository.listActiveMembers(placeId, onlyUserId);
    return members.map((member) => this.toResponse(member));
  }

  async setRole(
    actor: AuthenticatedActor,
    placeId: string,
    publicUserId: string,
    role: PlaceMemberRole,
  ) {
    return this.inSerializableTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        placeId,
        this.assignmentPermission(role),
        tx,
      );
      const target = await this.repository.findActiveUser(publicUserId, tx);
      if (!target) throw new NotFoundException('User not found');

      const existing = await this.repository.findMembership(placeId, target.id, tx);

      if (existing?.revokedAt === null && existing.role === role) return this.toResponse(existing);

      if (existing?.revokedAt === null && existing.role !== role) {
        await this.access.assertPermission(
          actor,
          placeId,
          this.revocationPermission(existing.role),
          tx,
        );
        if (
          existing.role === PlaceMemberRole.OWNER &&
          (await this.repository.countActiveOwners(placeId, tx)) <= 1
        ) {
          throw new ConflictException('The last active OWNER cannot be changed');
        }
      }

      const updated = await this.repository.setMembership(placeId, target.id, role, tx);
      await this.audit.append(
        {
          actor: { kind: 'USER', userId: actor.id },
          action: !existing
            ? 'PLACE_MEMBER_ASSIGNED'
            : existing.revokedAt
              ? 'PLACE_MEMBER_REACTIVATED'
              : 'PLACE_MEMBER_ROLE_UPDATED',
          targetType: 'PlaceMember',
          targetId: updated.id,
          beforeData: existing
            ? { role: existing.role, revokedAt: existing.revokedAt?.toISOString() ?? null }
            : undefined,
          afterData: { placeId, userId: target.userId, role: updated.role, revokedAt: null },
        },
        tx,
      );
      if (access.source === 'platform') {
        await this.audit.append(
          {
            actor: { kind: 'USER', userId: actor.id },
            action: 'ADMIN_CROSS_PLACE_MUTATION',
            targetType: 'PlaceMember',
            targetId: updated.id,
            afterData: {
              operation: existing?.revokedAt
                ? 'PLACE_MEMBER_REACTIVATED'
                : existing
                  ? 'PLACE_MEMBER_ROLE_UPDATED'
                  : 'PLACE_MEMBER_ASSIGNED',
              permission: access.permission,
              placeId,
              changedFields: ['role', 'revokedAt'],
            },
          },
          tx,
        );
      }
      return this.toResponse(updated);
    });
  }

  async revoke(actor: AuthenticatedActor, placeId: string, publicUserId: string) {
    return this.inSerializableTransaction(async (tx) => {
      await this.access.assertPermission(actor, placeId, PERMISSION.PLACE_MEMBER_READ, tx);
      const target = await this.repository.findActiveUser(publicUserId, tx);
      if (!target) throw new NotFoundException('User not found');
      const membership = await this.repository.findMembership(placeId, target.id, tx);
      if (!membership || membership.revokedAt) throw new NotFoundException('Membership not found');

      const access = await this.access.assertPermission(
        actor,
        placeId,
        this.revocationPermission(membership.role),
        tx,
      );
      if (
        membership.role === PlaceMemberRole.OWNER &&
        (await this.repository.countActiveOwners(placeId, tx)) <= 1
      ) {
        throw new ConflictException('The last active OWNER cannot be revoked');
      }

      const now = new Date();
      const revoked = await this.repository.revokeMembership(membership.id, now, tx);
      await this.audit.append(
        {
          actor: { kind: 'USER', userId: actor.id },
          action: 'PLACE_MEMBER_REVOKED',
          targetType: 'PlaceMember',
          targetId: membership.id,
          beforeData: { placeId, userId: target.userId, role: membership.role, revokedAt: null },
          afterData: { revokedAt: now.toISOString() },
        },
        tx,
      );
      if (access.source === 'platform') {
        await this.audit.append(
          {
            actor: { kind: 'USER', userId: actor.id },
            action: 'ADMIN_CROSS_PLACE_MUTATION',
            targetType: 'PlaceMember',
            targetId: membership.id,
            afterData: {
              operation: 'PLACE_MEMBER_REVOKED',
              permission: access.permission,
              placeId,
              changedFields: ['revokedAt'],
            },
          },
          tx,
        );
      }
      return this.toResponse(revoked);
    });
  }

  private assignmentPermission(role: PlaceMemberRole): Permission {
    return role === PlaceMemberRole.OWNER ? PERMISSION.OWNER_ASSIGN : PERMISSION.CASHIER_ASSIGN;
  }

  private revocationPermission(role: PlaceMemberRole): Permission {
    return role === PlaceMemberRole.OWNER ? PERMISSION.OWNER_REVOKE : PERMISSION.CASHIER_REVOKE;
  }

  private async inSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        isTransactionWriteConflict(error) ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      ) {
        throw new ConflictException('Concurrent membership change; retry the request');
      }
      throw error;
    }
  }

  private toResponse(member: {
    id: string;
    placeId: string;
    role: PlaceMemberRole;
    createdAt: Date;
    updatedAt: Date;
    revokedAt: Date | null;
    user: { userId: string; fullName: string; email: string };
  }) {
    return {
      membershipId: member.id,
      placeId: member.placeId,
      user: member.user,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      revokedAt: member.revokedAt?.toISOString() ?? null,
    };
  }
}
