import { jest } from '@jest/globals';

import { PlatformRole } from '@/generated/prisma/client';

import type { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

describe('PlacesService', () => {
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
