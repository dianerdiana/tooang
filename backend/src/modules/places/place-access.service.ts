import { Injectable, NotFoundException } from '@nestjs/common';

import type { PlaceMemberRole } from '@/generated/prisma/client';

import {
  type AuthenticatedActor,
  hasGlobalPlatformPermission,
  hasMembershipPermission,
  type Permission,
} from '@/common/auth';

import { type PlacesDbClient, PlacesRepository } from './places.repository';

export type PlaceAccess = {
  scope: 'global' | 'membership';
  membershipRole?: PlaceMemberRole;
};

@Injectable()
export class PlaceAccessService {
  constructor(private readonly repository: PlacesRepository) {}

  async assertPermission(
    actor: AuthenticatedActor,
    placeId: string,
    permission: Permission,
    db?: PlacesDbClient,
  ): Promise<PlaceAccess> {
    const place = await this.repository.findActivePlace(placeId, db);
    if (!place) throw new NotFoundException('Place not found');

    if (hasGlobalPlatformPermission(actor.platformRole, permission)) {
      return { scope: 'global' };
    }

    const membership = await this.repository.findActiveMembership(placeId, actor.id, db);
    if (!membership || !hasMembershipPermission(membership.role, permission)) {
      throw new NotFoundException('Place not found');
    }
    return { scope: 'membership', membershipRole: membership.role };
  }
}
