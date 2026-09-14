import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PlaceMemberRole, Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import type { CreateDiningTableInput, UpdateDiningTableInput } from './dining-tables.schema';
import { normalizeTableName } from './dining-tables.schema';
import { PlaceAccessService, type ResolvedPlaceAccess } from './place-access.service';
import { PlacesRepository } from './places.repository';

@Injectable()
export class DiningTablesService {
  constructor(
    private readonly repository: PlacesRepository,
    private readonly access: PlaceAccessService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async list(actor: AuthenticatedActor, placeId: string) {
    const access = await this.access.assertPermission(actor, placeId, PERMISSION.TABLE_READ);
    const activeOnly =
      access.source === 'membership' && access.membershipRole === PlaceMemberRole.CASHIER;
    return (await this.repository.listDiningTables(placeId, activeOnly)).map((table) =>
      this.toResponse(table),
    );
  }

  async get(actor: AuthenticatedActor, placeId: string, tableId: string) {
    const access = await this.access.assertPermission(actor, placeId, PERMISSION.TABLE_READ);
    const activeOnly =
      access.source === 'membership' && access.membershipRole === PlaceMemberRole.CASHIER;
    const table = await this.repository.findDiningTable(placeId, tableId, activeOnly);
    if (!table) throw new NotFoundException('Dining table not found');
    return this.toResponse(table);
  }

  create(actor: AuthenticatedActor, placeId: string, input: CreateDiningTableInput) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.TABLE_CREATE,
      'DINING_TABLE_CREATED',
      ['name'],
      (tx) =>
        this.repository.createDiningTable(
          placeId,
          input.name,
          normalizeTableName(input.name).toLowerCase(),
          tx,
        ),
    );
  }

  update(
    actor: AuthenticatedActor,
    placeId: string,
    tableId: string,
    input: UpdateDiningTableInput,
  ) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.TABLE_UPDATE,
      'DINING_TABLE_UPDATED',
      Object.keys(input),
      async (tx) => {
        if (!(await this.repository.findDiningTable(placeId, tableId, false, tx))) {
          throw new NotFoundException('Dining table not found');
        }
        return this.repository.updateDiningTable(
          placeId,
          tableId,
          {
            ...input,
            ...(input.name === undefined
              ? {}
              : { normalizedName: normalizeTableName(input.name).toLowerCase() }),
          },
          tx,
        );
      },
    );
  }

  remove(actor: AuthenticatedActor, placeId: string, tableId: string) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.TABLE_DELETE,
      'DINING_TABLE_DELETED',
      ['isActive', 'deletedAt'],
      async (tx) => {
        if (!(await this.repository.findDiningTable(placeId, tableId, false, tx))) {
          throw new NotFoundException('Dining table not found');
        }
        return this.repository.deleteDiningTable(placeId, tableId, new Date(), tx);
      },
    );
  }

  private async mutate<T extends Parameters<DiningTablesService['toResponse']>[0]>(
    actor: AuthenticatedActor,
    placeId: string,
    permission:
      | typeof PERMISSION.TABLE_CREATE
      | typeof PERMISSION.TABLE_UPDATE
      | typeof PERMISSION.TABLE_DELETE,
    operation: string,
    changedFields: string[],
    mutation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      const table = await this.prisma.$transaction(async (tx) => {
        const access = await this.access.assertPermission(actor, placeId, permission, tx);
        const result = await mutation(tx);
        await this.auditGlobalMutation(
          actor,
          access,
          placeId,
          result.id,
          operation,
          changedFields,
          tx,
        );
        return result;
      });
      return this.toResponse(table);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A dining table with that normalized name already exists');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent dining-table change; retry the request');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Dining table not found');
      }
      throw error;
    }
  }

  private async auditGlobalMutation(
    actor: AuthenticatedActor,
    access: ResolvedPlaceAccess,
    placeId: string,
    tableId: string,
    operation: string,
    changedFields: string[],
    tx: Prisma.TransactionClient,
  ) {
    if (access.source !== 'platform') return;
    await this.audit.append(
      {
        actorUserId: actor.id,
        action: 'ADMIN_CROSS_PLACE_MUTATION',
        targetType: 'DiningTable',
        targetId: tableId,
        afterData: { operation, permission: access.permission, placeId, changedFields },
      },
      tx,
    );
  }

  private toResponse(table: {
    id: string;
    placeId: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      tableId: table.id,
      placeId: table.placeId,
      name: table.name,
      isActive: table.isActive,
      createdAt: table.createdAt.toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    };
  }
}
