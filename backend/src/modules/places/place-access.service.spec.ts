import { NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import {
  PlaceMemberRole,
  PlatformRole,
  type PlatformRole as PlatformRoleType,
} from '@/generated/prisma/client';

import { PlaceAccessService } from './place-access.service';
import type { PlacesRepository } from './places.repository';

const actor = (platformRole: PlatformRoleType = PlatformRole.USER) => ({
  id: 'actor-id',
  userId: 'usr_actor',
  platformRole,
});

describe('PlaceAccessService', () => {
  it('allows an ADMIN only for permissions with global scope', async () => {
    const repository = {
      findActivePlace: jest.fn(() => Promise.resolve({ id: 'place-id' })),
      findActiveMembership: jest.fn(() => Promise.resolve(null)),
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(PlatformRole.ADMIN), 'place-id', 'place.update'),
    ).resolves.toEqual({ scope: 'global' });
    await expect(
      service.assertPermission(actor(PlatformRole.ADMIN), 'place-id', 'order.confirm'),
    ).rejects.toBeInstanceOf(NotFoundException);
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

    await expect(service.assertPermission(actor(), 'place-id', 'order.confirm')).resolves.toEqual({
      scope: 'membership',
      membershipRole: PlaceMemberRole.CASHIER,
    });
    await expect(
      service.assertPermission(actor(), 'other-place', 'order.confirm'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hides missing places from every actor', async () => {
    const repository = {
      findActivePlace: jest.fn(() => Promise.resolve(null)),
    } as unknown as PlacesRepository;
    const service = new PlaceAccessService(repository);

    await expect(
      service.assertPermission(actor(PlatformRole.SUPER_ADMIN), 'missing', 'place.read'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
