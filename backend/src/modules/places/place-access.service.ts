import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { PlaceMemberRole } from '@/generated/prisma/client';

import {
  type AuthenticatedActor,
  getMembershipPermissionScope,
  getMembershipRolesForPermission,
  hasGlobalPlatformPermission,
  type Permission,
} from '@/common/auth';

import { type PlacesDbClient, PlacesRepository } from './places.repository';

export type PlaceQueryScope =
  | { kind: 'global'; permission: Permission }
  | {
      kind: 'membership';
      permission: Permission;
      actorId: string;
      allowedRoles: readonly PlaceMemberRole[];
    };

export type ResolvedPlaceAccess =
  | { source: 'platform'; resourceScope: 'global'; permission: Permission }
  | {
      source: 'membership';
      resourceScope: 'member' | 'owned';
      permission: Permission;
      membershipId: string;
      membershipRole: PlaceMemberRole;
    };

@Injectable()
export class PlaceAccessService {
  constructor(private readonly repository: PlacesRepository) {}

  resolveScope(actor: AuthenticatedActor, permission: Permission): PlaceQueryScope {
    if (hasGlobalPlatformPermission(actor.platformRole, permission)) {
      return { kind: 'global', permission };
    }

    const allowedRoles = getMembershipRolesForPermission(permission);
    if (!allowedRoles.length) throw new ForbiddenException('Insufficient permissions');

    return {
      kind: 'membership',
      permission,
      actorId: actor.id,
      allowedRoles,
    };
  }

  async assertPermission(
    actor: AuthenticatedActor,
    placeId: string,
    permission: Permission,
    db?: PlacesDbClient,
  ): Promise<ResolvedPlaceAccess> {
    const scope = this.resolveScope(actor, permission);
    if (scope.kind === 'global') {
      const place = await this.repository.findActivePlace(placeId, db);
      if (!place) throw new NotFoundException('Place not found');
      return { source: 'platform', resourceScope: 'global', permission };
    }

    const membership = await this.repository.findActiveMembership(
      placeId,
      scope.actorId,
      scope.allowedRoles,
      db,
    );
    if (!membership) throw new NotFoundException('Place not found');

    const resourceScope = getMembershipPermissionScope(membership.role, permission);
    if (!resourceScope) throw new NotFoundException('Place not found');

    return {
      source: 'membership',
      resourceScope,
      permission,
      membershipId: membership.id,
      membershipRole: membership.role,
    };
  }
}
