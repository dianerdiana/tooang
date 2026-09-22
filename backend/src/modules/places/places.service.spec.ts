import { ForbiddenException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { PlatformRole } from '@/generated/prisma/client';

import type { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

describe('PlacesService', () => {
  it('resolves target-place access before returning management details', async () => {
    const place = {
      id: 'place-id',
      name: 'Managed Place',
      slug: 'managed-place',
      type: 'CAFE' as const,
      description: null,
      address: 'Address',
      city: null,
      latitude: null,
      longitude: null,
      phone: null,
      whatsapp: null,
      timezone: 'Asia/Jakarta',
      isPublished: false,
      isOrderingEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      logoAsset: null,
      coverAsset: null,
    };
    const findActivePlaceDetails = jest.fn(() => Promise.resolve(place));
    const assertPermission = jest.fn(() => Promise.resolve({ source: 'membership' }));
    const service = new PlacesService(
      { findActivePlaceDetails } as unknown as PlacesRepository,
      {} as never,
      {} as never,
      { assertPermission } as never,
    );
    const actor = { id: 'owner-id', userId: 'usr_owner', platformRole: PlatformRole.USER };

    await expect(service.getManagement(actor, 'place-id')).resolves.toMatchObject({
      id: 'place-id',
      logoUrl: null,
      coverUrl: null,
    });
    expect(assertPermission).toHaveBeenCalledWith(actor, 'place-id', 'place.read');
    expect(findActivePlaceDetails).toHaveBeenCalledWith('place-id');
  });

  it('allows only a global place reader to list management places', async () => {
    const listManagement = jest.fn(() => Promise.resolve({ places: [], totalItems: 0 }));
    const repository = { listManagement } as unknown as PlacesRepository;
    const service = new PlacesService(repository, {} as never, {} as never, {} as never);
    const input = { page: 1, limit: 20 };

    await expect(
      service.listManagement(
        { id: 'admin-id', userId: 'usr_admin', platformRole: PlatformRole.ADMIN },
        input,
      ),
    ).resolves.toEqual({
      places: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    await expect(
      service.listManagement(
        { id: 'user-id', userId: 'usr_user', platformRole: PlatformRole.USER },
        input,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(listManagement).toHaveBeenCalledTimes(1);
  });

  it('creates the place and initial OWNER membership with both audits in one transaction', async () => {
    const place = {
      id: 'place-id',
      name: 'Test Place',
      slug: 'test-place',
      type: 'CAFE' as const,
      description: null,
      address: 'Address',
      city: null,
      latitude: null,
      longitude: null,
      phone: null,
      whatsapp: null,
      timezone: 'Asia/Jakarta',
      isPublished: false,
      isOrderingEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [{ id: 'membership-id' }],
    };
    const createWithInitialOwner = jest.fn(() => Promise.resolve(place));
    const repository = { createWithInitialOwner } as unknown as PlacesRepository;
    const appendAudit = jest.fn((_data: unknown, _tx: unknown) => Promise.resolve({}));
    const audit = { append: appendAudit };
    const tx = {};
    const prisma = {
      $transaction: jest.fn((callback: (client: object) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    const service = new PlacesService(repository, audit as never, prisma as never);
    const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: PlatformRole.ADMIN };

    await service.create(actor, {
      name: 'Test Place',
      slug: 'test-place',
      type: 'CAFE',
      address: 'Address',
      timezone: 'Asia/Jakarta',
    });

    expect(createWithInitialOwner).toHaveBeenCalledWith(expect.any(Object), actor.id, tx);
    expect(appendAudit).toHaveBeenCalledTimes(2);
    const secondAudit = appendAudit.mock.calls[1]?.[0] as {
      action: string;
      afterData: { role: string };
    };
    expect(secondAudit.action).toBe('PLACE_MEMBER_ASSIGNED');
    expect(secondAudit.afterData.role).toBe('OWNER');
    expect(appendAudit.mock.calls[1]?.[1]).toBe(tx);
  });
});
