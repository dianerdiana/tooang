import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma, RoleCode } from '@/generated/prisma/client';

import { UserRoleEnum } from '@/common/auth';
import { HttpResponse, toSafeUserResponse } from '@/common/responses';

import { PrismaService } from '@/lib/prisma.service';

import { UsersRepository } from './users.repository';
import type { AssignRoleInput, ListUsersInput, UpdateMeInput } from './users.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getMe(actorUserId: string) {
    const user = await this.requireActiveUser(actorUserId);
    return HttpResponse.success({
      message: 'User profile retrieved',
      data: { user: toSafeUserResponse(user) },
    });
  }

  async updateMe(actorUserId: string, input: UpdateMeInput) {
    const user = await this.requireActiveUser(actorUserId);
    try {
      const updated = await this.repository.updateProfile(user.id, input);
      return HttpResponse.success({
        message: 'User profile updated',
        data: { user: toSafeUserResponse(updated) },
      });
    } catch (error) {
      this.translateEmailConflict(error);
      throw error;
    }
  }

  async list(actorUserId: string, query: ListUsersInput) {
    await this.requireSuperAdmin(actorUserId);
    const [users, totalItems] = await this.repository.listActive(query);
    return HttpResponse.success({
      message: 'Users retrieved',
      data: { users: users.map(toSafeUserResponse) },
      meta: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        column: query.column,
        sort: query.sort,
        totalItems,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    });
  }

  async getById(actorUserId: string, targetUserId: string) {
    await this.requireSuperAdmin(actorUserId);
    const target = await this.repository.findActiveByPublicId(targetUserId);
    if (!target) throw new NotFoundException('User not found');
    return HttpResponse.success({
      message: 'User retrieved',
      data: { user: toSafeUserResponse(target) },
    });
  }

  async assignRole(actorUserId: string, targetUserId: string, input: AssignRoleInput) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const actor = await this.requireSuperAdmin(actorUserId, tx);
        const target = await this.repository.findActiveByPublicId(targetUserId, tx);
        if (!target) throw new NotFoundException('User not found');
        const role = await this.repository.findRole(input.role, tx);
        if (!role) throw new NotFoundException('Role not found');
        const existing = await this.repository.findRoleAssignment(target.id, role.id, tx);
        if (!existing) {
          await this.repository.assignRole(target.id, role.id, tx);
          await this.repository.createAudit(
            {
              actorUserId: actor.id,
              action: 'USER_ROLE_ASSIGNED',
              targetType: 'USER',
              targetId: target.userId,
              beforeData: { roles: this.roleCodes(target) },
              afterData: { roles: [...this.roleCodes(target), role.code] },
            },
            tx,
          );
        }
        const updated = await this.repository.findActiveByPublicId(targetUserId, tx);
        return updated!;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return HttpResponse.success({
      message: 'Role assigned',
      data: { user: { userId: result.userId, roles: this.roleCodes(result) } },
    });
  }

  async revokeRole(actorUserId: string, targetUserId: string, roleCode: UserRoleEnum) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const actor = await this.requireSuperAdmin(actorUserId, tx);
        const target = await this.repository.findActiveByPublicId(targetUserId, tx);
        if (!target) throw new NotFoundException('User not found');
        const role = await this.repository.findRole(roleCode, tx);
        if (!role) throw new NotFoundException('Role not found');
        const assignment = await this.repository.findRoleAssignment(target.id, role.id, tx);
        if (!assignment) throw new NotFoundException('Role assignment not found');
        if ((await this.repository.countRoles(target.id, tx)) <= 1) {
          throw new ConflictException('An active user must retain at least one role');
        }
        if (
          role.code === RoleCode.OWNER &&
          (await this.repository.countOwnerRelationships(target.id, tx)) > 0
        ) {
          throw new ConflictException('OWNER role cannot be removed while places are owned');
        }
        if (
          role.code === RoleCode.SUPER_ADMIN &&
          (await this.repository.countActiveSuperAdmins(tx)) <= 1
        ) {
          throw new ConflictException('The last active SUPER_ADMIN role cannot be removed');
        }

        const beforeRoles = this.roleCodes(target);
        await this.repository.revokeRole(target.id, role.id, tx);
        await this.repository.createAudit(
          {
            actorUserId: actor.id,
            action: 'USER_ROLE_REVOKED',
            targetType: 'USER',
            targetId: target.userId,
            beforeData: { roles: beforeRoles },
            afterData: {
              roles: beforeRoles.filter((value) => value !== (role.code as UserRoleEnum)),
            },
          },
          tx,
        );
        const updated = await this.repository.findActiveByPublicId(targetUserId, tx);
        return updated!;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return HttpResponse.success({
      message: 'Role revoked',
      data: { user: { userId: result.userId, roles: this.roleCodes(result) } },
    });
  }

  async deactivate(actorUserId: string, targetUserId: string) {
    const deletedAt = new Date();
    const result = await this.prisma.$transaction(
      async (tx) => {
        const actor = await this.requireSuperAdmin(actorUserId, tx);
        const target = await this.repository.findActiveByPublicId(targetUserId, tx);
        if (!target) throw new NotFoundException('User not found');
        if (actor.id === target.id) throw new ConflictException('Self-deactivation is not allowed');

        const roles = this.roleCodes(target);
        if (
          roles.includes(UserRoleEnum.SuperAdmin) &&
          (await this.repository.countActiveSuperAdmins(tx)) <= 1
        ) {
          throw new ConflictException('The last active SUPER_ADMIN cannot be deactivated');
        }
        const blockedOwnership = await this.repository.findPlaceWithoutAlternateOwner(
          target.id,
          tx,
        );
        if (blockedOwnership) {
          throw new ConflictException(
            `User is the last active owner of place ${blockedOwnership.place.name}`,
          );
        }

        await this.repository.removeOwnerships(target.id, tx);
        await this.repository.revokeAllSessions(target.id, deletedAt, tx);
        const deactivated = await this.repository.deactivateUser(target.id, deletedAt, tx);
        await this.repository.createAudit(
          {
            actorUserId: actor.id,
            action: 'USER_DEACTIVATED',
            targetType: 'USER',
            targetId: target.userId,
            beforeData: { deletedAt: null, roles },
            afterData: { deletedAt: deletedAt.toISOString(), roles },
          },
          tx,
        );
        return deactivated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return HttpResponse.success({
      message: 'User deactivated',
      data: { userId: result.userId, deletedAt: deletedAt.toISOString() },
    });
  }

  private async requireActiveUser(userId: string, db?: Prisma.TransactionClient) {
    const user = await this.repository.findActiveByPublicId(userId, db);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async requireSuperAdmin(userId: string, db?: Prisma.TransactionClient) {
    const user = await this.requireActiveUser(userId, db);
    if (!this.roleCodes(user).includes(UserRoleEnum.SuperAdmin)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return user;
  }

  private roleCodes(user: { roles: Array<{ role: { code: string } }> }): UserRoleEnum[] {
    return user.roles.map(({ role }) => role.code as UserRoleEnum);
  }

  private translateEmailConflict(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Email is already registered');
    }
  }
}
