import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import {
  PlaceMemberRole,
  PlatformRole,
  type PlatformRole as PlatformRoleType,
} from '@/generated/prisma/client';

import { PERMISSION } from '@/common/auth';

import { PlaceAccessService } from './place-access.service';
import type { PlacesRepository } from './places.repository';

const actor = (platformRole: PlatformRoleType = PlatformRole.USER) => ({
  id: 'actor-id',
  userId: 'usr_actor',
  platformRole,
});

describe('PlaceAccessService', () => {
  it('allows an ADMIN only for permissions with global scope', async () => {
    const findActiveMembership = jest.fn(() => Promise.resolve(null));
    const repository = {
      findActivePlace: jest.fn(() => Promise.resolve({ id: 'place-id' })),
      findActiveMembership,
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(PlatformRole.ADMIN), 'place-id', PERMISSION.PLACE_UPDATE),
    ).resolves.toEqual({
      source: 'platform',
      resourceScope: 'global',
      permission: PERMISSION.PLACE_UPDATE,
    });
    await expect(
      service.assertPermission(actor(PlatformRole.ADMIN), 'place-id', PERMISSION.ORDER_CONFIRM),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(findActiveMembership).toHaveBeenCalledWith(
      'place-id',
      'actor-id',
      [PlaceMemberRole.OWNER, PlaceMemberRole.CASHIER],
      undefined,
    );
  });

  it('allows an active matching membership and denies a foreign tenant', async () => {
    const repository = {
      findActivePlace: jest.fn(() => Promise.resolve({ id: 'place-id' })),
      findActiveMembership: jest
        .fn<() => Promise<{ id: string; role: PlaceMemberRole } | null>>()
        .mockResolvedValueOnce({ id: 'membership-id', role: PlaceMemberRole.CASHIER })
        .mockResolvedValueOnce(null),
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(), 'place-id', PERMISSION.ORDER_CONFIRM),
    ).resolves.toEqual({
      source: 'membership',
      resourceScope: 'member',
      permission: PERMISSION.ORDER_CONFIRM,
      membershipId: 'membership-id',
      membershipRole: PlaceMemberRole.CASHIER,
    });
    await expect(
      service.assertPermission(actor(), 'other-place', PERMISSION.ORDER_CONFIRM),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses an independent membership when ADMIN lacks a global grant', async () => {
    const repository = {
      findActiveMembership: jest.fn(() =>
        Promise.resolve({ id: 'cashier-membership', role: PlaceMemberRole.CASHIER }),
      ),
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(PlatformRole.ADMIN), 'place-id', PERMISSION.ORDER_CONFIRM),
    ).resolves.toEqual({
      source: 'membership',
      resourceScope: 'member',
      permission: PERMISSION.ORDER_CONFIRM,
      membershipId: 'cashier-membership',
      membershipRole: PlaceMemberRole.CASHIER,
    });
  });

  it('defaults to forbidden when neither platform nor membership can grant the permission', () => {
    const repository = {} as PlacesRepository;
    const service = new PlaceAccessService(repository);

    expect(() => service.resolveScope(actor(PlatformRole.ADMIN), PERMISSION.OWNER_ASSIGN)).toThrow(
      ForbiddenException,
    );
  });

  it('resolves reusable global and membership query scopes', () => {
    const service = new PlaceAccessService({} as PlacesRepository);

    expect(service.resolveScope(actor(PlatformRole.ADMIN), PERMISSION.PLACE_UPDATE)).toEqual({
      kind: 'global',
      permission: PERMISSION.PLACE_UPDATE,
    });
    expect(service.resolveScope(actor(), PERMISSION.PLACE_UPDATE)).toEqual({
      kind: 'membership',
      permission: PERMISSION.PLACE_UPDATE,
      actorId: 'actor-id',
      allowedRoles: [PlaceMemberRole.OWNER],
    });
  });

  it('forwards a transaction client to the constrained membership lookup', async () => {
    const tx = { placeMember: {} };
    const findActiveMembership = jest.fn(() =>
      Promise.resolve({ id: 'membership-id', role: PlaceMemberRole.OWNER }),
    );
    const repository = {
      findActiveMembership,
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await service.assertPermission(actor(), 'place-id', PERMISSION.PLACE_UPDATE, tx as never);
    expect(findActiveMembership).toHaveBeenCalledWith(
      'place-id',
      'actor-id',
      [PlaceMemberRole.OWNER],
      tx,
    );
  });

  it('hides missing places from every actor', async () => {
    const repository = {
      findActivePlace: jest.fn(() => Promise.resolve(null)),
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(PlatformRole.SUPER_ADMIN), 'missing', PERMISSION.PLACE_READ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
