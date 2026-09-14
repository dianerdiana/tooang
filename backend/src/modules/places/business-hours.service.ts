import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import type { BusinessHourInput, BusinessHourParam } from './business-hours.schema';
import { PlaceAccessService, type ResolvedPlaceAccess } from './place-access.service';
import { serializeBusinessHours } from './place-opening-state.service';
import { PlacesRepository } from './places.repository';

function parseTime(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

@Injectable()
export class BusinessHoursService {
  constructor(
    private readonly repository: PlacesRepository,
    private readonly access: PlaceAccessService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async list(actor: AuthenticatedActor, placeId: string) {
    await this.access.assertPermission(actor, placeId, PERMISSION.PLACE_READ);
    return serializeBusinessHours(await this.repository.listBusinessHours(placeId));
  }

  async upsert(actor: AuthenticatedActor, params: BusinessHourParam, input: BusinessHourInput) {
    return this.inTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        params.placeId,
        PERMISSION.PLACE_UPDATE,
        tx,
      );
      const hour = await this.repository.upsertBusinessHour(
        params.placeId,
        params.day,
        input.isClosed
          ? { isClosed: true, opensAt: null, closesAt: null }
          : {
              isClosed: false,
              opensAt: parseTime(input.opensAt),
              closesAt: parseTime(input.closesAt),
            },
        tx,
      );
      await this.auditGlobalMutation(actor, access, params.placeId, ['businessHours'], tx);
      return serializeBusinessHours([hour]).find((entry) => entry.day === params.day);
    });
  }

  private async auditGlobalMutation(
    actor: AuthenticatedActor,
    access: ResolvedPlaceAccess,
    placeId: string,
    changedFields: string[],
    tx: Prisma.TransactionClient,
  ) {
    if (access.source !== 'platform') return;
    await this.audit.append(
      {
        actorUserId: actor.id,
        action: 'ADMIN_CROSS_PLACE_MUTATION',
        targetType: 'Place',
        targetId: placeId,
        afterData: {
          operation: 'BUSINESS_HOURS_UPDATED',
          permission: access.permission,
          placeId,
          changedFields,
        },
      },
      tx,
    );
  }

  private async inTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    try {
      return await this.prisma.$transaction(callback);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException('Concurrent business-hours change; retry the request');
      }
      throw error;
    }
  }
}
