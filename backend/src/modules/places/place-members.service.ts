import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PlaceMemberRole, Prisma } from '@/generated/prisma/client';

import type { AuthenticatedUser, Permission } from '@/common/auth';

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

  async list(actor: AuthenticatedUser, placeId: string) {
    const access = await this.access.assertPermission(actor, placeId, 'place_member.read');
    const onlyUserId =
      access.scope === 'membership' && access.membershipRole === PlaceMemberRole.CASHIER
        ? actor.id
        : undefined;
    const members = await this.repository.listActiveMembers(placeId, onlyUserId);
    return members.map((member) => this.toResponse(member));
  }

  async setRole(
    actor: AuthenticatedUser,
    placeId: string,
    publicUserId: string,
    role: PlaceMemberRole,
  ) {
    return this.inSerializableTransaction(async (tx) => {
      await this.access.assertPermission(actor, placeId, this.assignmentPermission(role), tx);
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
          actorUserId: actor.id,
          action: existing ? 'PLACE_MEMBER_ROLE_UPDATED' : 'PLACE_MEMBER_ASSIGNED',
          targetType: 'PlaceMember',
          targetId: updated.id,
          beforeData: existing
            ? { role: existing.role, revokedAt: existing.revokedAt?.toISOString() ?? null }
            : undefined,
          afterData: { placeId, userId: target.userId, role: updated.role, revokedAt: null },
        },
        tx,
      );
      return this.toResponse(updated);
    });
  }

  async revoke(actor: AuthenticatedUser, placeId: string, publicUserId: string) {
    return this.inSerializableTransaction(async (tx) => {
      await this.access.assertPermission(actor, placeId, 'place_member.read', tx);
      const target = await this.repository.findActiveUser(publicUserId, tx);
      if (!target) throw new NotFoundException('User not found');
      const membership = await this.repository.findMembership(placeId, target.id, tx);
      if (!membership || membership.revokedAt) throw new NotFoundException('Membership not found');

      await this.access.assertPermission(
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
          actorUserId: actor.id,
          action: 'PLACE_MEMBER_REVOKED',
          targetType: 'PlaceMember',
          targetId: membership.id,
          beforeData: { placeId, userId: target.userId, role: membership.role, revokedAt: null },
          afterData: { revokedAt: now.toISOString() },
        },
        tx,
      );
      return this.toResponse(revoked);
    });
  }

  private assignmentPermission(role: PlaceMemberRole): Permission {
    return role === PlaceMemberRole.OWNER ? 'owner.assign' : 'cashier.assign';
  }

  private revocationPermission(role: PlaceMemberRole): Permission {
    return role === PlaceMemberRole.OWNER ? 'owner.revoke' : 'cashier.revoke';
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
