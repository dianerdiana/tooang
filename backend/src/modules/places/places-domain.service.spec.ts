import { ConflictException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { PlatformRole } from '@/generated/prisma/client';

import { PlacesService } from './places.service';

const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: PlatformRole.USER };
const place = {
  id: 'place-id',
  name: 'Cafe',
  slug: 'cafe',
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
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function setup(overrides: Record<string, unknown> = {}) {
  const repository = {
    findActivePlaceDetails: jest.fn(() => Promise.resolve(place)),
    countActiveOwners: jest.fn(() => Promise.resolve(1)),
    countPublishableMenuItems: jest.fn(() => Promise.resolve(1)),
    countUnresolvedOrders: jest.fn(() => Promise.resolve(0)),
    updateActivePlace: jest.fn((_id: string, data: object) =>
      Promise.resolve({ ...place, ...data }),
    ),
    deleteActivePlace: jest.fn(() => Promise.resolve({ ...place, isPublished: false })),
    ...overrides,
  };
  const access = {
    assertPermission: jest.fn(() =>
      Promise.resolve({
        source: 'membership',
        membershipRole: 'OWNER',
        permission: 'place.update',
      }),
    ),
  };
  const audit = { append: jest.fn(() => Promise.resolve({})) };
  const tx = {};
  const prisma = {
    $transaction: jest.fn((callback: (client: object) => unknown) => Promise.resolve(callback(tx))),
  };
  return {
    repository,
    access,
    audit,
    service: new PlacesService(
      repository as never,
      audit as never,
      prisma as never,
      access as never,
    ),
  };
}

describe('PlacesService domain rules', () => {
  it.each(['api', 'admin', 'auth', 'me', 'users', 'places'])(
    'rejects reserved slug %s as a conflict',
    (slug) => {
      const { service } = setup();
      expect(() => service.update(actor, place.id, { slug })).toThrow(ConflictException);
    },
  );

  it.each([
    ['owner', { countActiveOwners: jest.fn(() => Promise.resolve(0)) }],
    ['menu', { countPublishableMenuItems: jest.fn(() => Promise.resolve(0)) }],
  ])('rejects publishing without required %s readiness', async (_name, overrides) => {
    const { service } = setup(overrides);
    await expect(service.setPublishing(actor, place.id, true)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requires publication and an available menu item before enabling ordering', async () => {
    const unpublished = setup();
    await expect(unpublished.service.setOrdering(actor, place.id, true)).rejects.toBeInstanceOf(
      ConflictException,
    );

    const unavailable = setup({
      findActivePlaceDetails: jest.fn(() => Promise.resolve({ ...place, isPublished: true })),
      countPublishableMenuItems: jest.fn(() => Promise.resolve(0)),
    });
    await expect(unavailable.service.setOrdering(actor, place.id, true)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('disables ordering without mutating orders and audits the setting change', async () => {
    const current = { ...place, isPublished: true, isOrderingEnabled: true };
    const { service, repository, audit } = setup({
      findActivePlaceDetails: jest.fn(() => Promise.resolve(current)),
    });
    const response = await service.setOrdering(actor, place.id, false);
    expect(repository.updateActivePlace).toHaveBeenCalledWith(
      place.id,
      { isOrderingEnabled: false },
      expect.anything(),
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDERING_SETTING_UPDATED' }),
      expect.anything(),
    );
    expect(response.isOrderingEnabled).toBe(false);
  });

  it('blocks soft deletion while unresolved orders exist', async () => {
    const { service, repository } = setup({
      countUnresolvedOrders: jest.fn(() => Promise.resolve(1)),
    });
    await expect(service.remove(actor, place.id)).rejects.toBeInstanceOf(ConflictException);
    expect(repository.deleteActivePlace).not.toHaveBeenCalled();
  });

  it('adds a safe cross-place audit for platform-global mutations', async () => {
    const { service, access, audit } = setup();
    access.assertPermission.mockResolvedValue({
      source: 'platform',
      resourceScope: 'global',
      permission: 'place.update',
    });
    await service.update({ ...actor, platformRole: PlatformRole.ADMIN }, place.id, {
      name: 'Updated',
    });
    const event = audit.append.mock.calls[0]?.[0] as unknown as {
      action: string;
      afterData: { changedFields: string[] };
    };
    expect(event.action).toBe('ADMIN_CROSS_PLACE_MUTATION');
    expect(event.afterData.changedFields).toEqual(['name']);
  });
});
