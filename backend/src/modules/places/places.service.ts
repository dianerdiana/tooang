import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import type { AuthenticatedActor } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import { PlacesRepository } from './places.repository';
import type { CreatePlaceInput } from './places.schema';

@Injectable()
export class PlacesService {
  constructor(
    private readonly repository: PlacesRepository,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async create(actor: AuthenticatedActor, input: CreatePlaceInput) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const place = await this.repository.createWithInitialOwner(input, actor.id, tx);
          const membershipId = place.members[0].id;
          await this.audit.append(
            {
              actorUserId: actor.id,
              action: 'PLACE_CREATED',
              targetType: 'Place',
              targetId: place.id,
              afterData: { name: place.name, slug: place.slug },
            },
            tx,
          );
          await this.audit.append(
            {
              actorUserId: actor.id,
              action: 'PLACE_MEMBER_ASSIGNED',
              targetType: 'PlaceMember',
              targetId: membershipId,
              afterData: { placeId: place.id, userId: actor.userId, role: 'OWNER' },
            },
            tx,
          );
          const { members: _members, ...response } = place;
          return response;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException(
          'Place creation conflicted with current data; retry the request',
        );
      }
      throw error;
    }
  }
}
