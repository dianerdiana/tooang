import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import { PlaceAccessService, type ResolvedPlaceAccess } from './place-access.service';
import { evaluatePlaceOpen, serializeBusinessHours } from './place-opening-state.service';
import { PlacesRepository } from './places.repository';
import {
  type CreatePlaceInput,
  isIanaTimezone,
  isReservedPlaceSlug,
  type ListPlacesInput,
  type UpdatePlaceInput,
} from './places.schema';

@Injectable()
export class PlacesService {
  constructor(
    private readonly repository: PlacesRepository,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly access: PlaceAccessService,
  ) {}

  async listPublic(input: ListPlacesInput) {
    const result = await this.repository.listPublic(input);
    return {
      places: result.places.map((place) => this.toResponse(place)),
      meta: {
        page: input.page,
        limit: input.limit,
        ...(input.search ? { search: input.search } : {}),
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / input.limit),
      },
    };
  }

  async getPublic(slug: string, instant = new Date()) {
    const place = await this.repository.findPublicBySlug(slug);
    if (!place) throw new NotFoundException('Place not found');
    const { businessHours, ...profile } = place;
    return {
      ...this.toResponse(profile),
      businessHours: serializeBusinessHours(businessHours),
      isOpen: evaluatePlaceOpen(place.timezone, businessHours, instant),
    };
  }

  async create(actor: AuthenticatedActor, input: CreatePlaceInput) {
    if (isReservedPlaceSlug(input.slug)) throw new ConflictException('Place slug is reserved');
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
          return this.toResponse(response);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error, 'Place creation conflicted with current data; retry the request');
    }
  }

  update(actor: AuthenticatedActor, placeId: string, input: UpdatePlaceInput) {
    if (input.slug && isReservedPlaceSlug(input.slug)) {
      throw new ConflictException('Place slug is reserved');
    }
    return this.inSerializableTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        placeId,
        PERMISSION.PLACE_UPDATE,
        tx,
      );
      const place = await this.repository.updateActivePlace(placeId, input, tx);
      await this.auditGlobalMutation(
        actor,
        access,
        placeId,
        'PLACE_UPDATED',
        Object.keys(input),
        tx,
      );
      return this.toResponse(place);
    });
  }

  remove(actor: AuthenticatedActor, placeId: string) {
    return this.inSerializableTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        placeId,
        PERMISSION.PLACE_DELETE,
        tx,
      );
      const current = await this.repository.findActivePlaceDetails(placeId, tx);
      if (!current) throw new NotFoundException('Place not found');
      if ((await this.repository.countUnresolvedOrders(placeId, new Date(), tx)) > 0) {
        throw new ConflictException('Place has unresolved orders');
      }
      const place = await this.repository.deleteActivePlace(placeId, new Date(), tx);
      if (current.isOrderingEnabled) {
        await this.audit.append(
          {
            actorUserId: actor.id,
            action: 'ORDERING_SETTING_UPDATED',
            targetType: 'Place',
            targetId: placeId,
            beforeData: { isOrderingEnabled: true },
            afterData: { isOrderingEnabled: false },
          },
          tx,
        );
      }
      await this.auditGlobalMutation(
        actor,
        access,
        placeId,
        'PLACE_SOFT_DELETED',
        ['deletedAt', 'isPublished', 'isOrderingEnabled'],
        tx,
      );
      return this.toResponse(place);
    });
  }

  setPublishing(actor: AuthenticatedActor, placeId: string, isPublished: boolean) {
    return this.inSerializableTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        placeId,
        PERMISSION.PLACE_PUBLISH,
        tx,
      );
      const place = await this.repository.findActivePlaceDetails(placeId, tx);
      if (!place) throw new NotFoundException('Place not found');
      if (isPublished) {
        if (!place.name.trim() || !place.address.trim() || !isIanaTimezone(place.timezone)) {
          throw new ConflictException('Place identity is not ready for publishing');
        }
        if ((await this.repository.countActiveOwners(placeId, tx)) < 1) {
          throw new ConflictException('Place requires an active OWNER before publishing');
        }
        if ((await this.repository.countPublishableMenuItems(placeId, false, tx)) < 1) {
          throw new ConflictException('Place requires configured menu content before publishing');
        }
      }
      const updated = await this.repository.updateActivePlace(
        placeId,
        isPublished ? { isPublished: true } : { isPublished: false, isOrderingEnabled: false },
        tx,
      );
      if (!isPublished && place.isOrderingEnabled) {
        await this.audit.append(
          {
            actorUserId: actor.id,
            action: 'ORDERING_SETTING_UPDATED',
            targetType: 'Place',
            targetId: placeId,
            beforeData: { isOrderingEnabled: true },
            afterData: { isOrderingEnabled: false },
          },
          tx,
        );
      }
      await this.auditGlobalMutation(
        actor,
        access,
        placeId,
        'PLACE_PUBLISHING_UPDATED',
        isPublished ? ['isPublished'] : ['isPublished', 'isOrderingEnabled'],
        tx,
      );
      return this.toResponse(updated);
    });
  }

  setOrdering(actor: AuthenticatedActor, placeId: string, isOrderingEnabled: boolean) {
    return this.inSerializableTransaction(async (tx) => {
      const access = await this.access.assertPermission(
        actor,
        placeId,
        PERMISSION.PLACE_UPDATE,
        tx,
      );
      const place = await this.repository.findActivePlaceDetails(placeId, tx);
      if (!place) throw new NotFoundException('Place not found');
      if (isOrderingEnabled) {
        if (!place.isPublished) throw new ConflictException('Place must be published for ordering');
        if ((await this.repository.countPublishableMenuItems(placeId, true, tx)) < 1) {
          throw new ConflictException('Place requires an available menu item for ordering');
        }
      }
      if (place.isOrderingEnabled === isOrderingEnabled) return this.toResponse(place);
      const updated = await this.repository.updateActivePlace(placeId, { isOrderingEnabled }, tx);
      await this.audit.append(
        {
          actorUserId: actor.id,
          action: 'ORDERING_SETTING_UPDATED',
          targetType: 'Place',
          targetId: placeId,
          beforeData: { isOrderingEnabled: place.isOrderingEnabled },
          afterData: { isOrderingEnabled },
        },
        tx,
      );
      await this.auditGlobalMutation(
        actor,
        access,
        placeId,
        'ORDERING_SETTING_UPDATED',
        ['isOrderingEnabled'],
        tx,
      );
      return this.toResponse(updated);
    });
  }

  private async auditGlobalMutation(
    actor: AuthenticatedActor,
    access: ResolvedPlaceAccess,
    placeId: string,
    operation: string,
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
        afterData: { operation, permission: access.permission, placeId, changedFields },
      },
      tx,
    );
  }

  private async inSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      this.rethrowConflict(error, 'Concurrent place change; retry the request');
    }
  }

  private rethrowConflict(error: unknown, message: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    ) {
      throw new ConflictException(message);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Place not found');
    }
    throw error;
  }

  private toResponse<
    T extends {
      latitude: unknown;
      longitude: unknown;
      logoAsset?: { status: string; deliveryUrl: string } | null;
      coverAsset?: { status: string; deliveryUrl: string } | null;
    },
  >(place: T) {
    const { logoAsset, coverAsset, ...safePlace } = place;
    return {
      ...safePlace,
      latitude: place.latitude === null ? null : Number(place.latitude),
      longitude: place.longitude === null ? null : Number(place.longitude),
      logoUrl: logoAsset?.status === 'ACTIVE' ? logoAsset.deliveryUrl : null,
      coverUrl: coverAsset?.status === 'ACTIVE' ? coverAsset.deliveryUrl : null,
    };
  }
}
