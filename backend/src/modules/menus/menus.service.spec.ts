import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { MenusService } from './menus.service';

describe('MenusService', () => {
  const actor = { id: 'actor-internal', userId: 'usr_1', platformRole: 'ADMIN' as const };
  const tx = { marker: 'tx' };
  const now = new Date('2026-09-14T00:00:00.000Z');
  const baseItem = {
    id: 'item-internal',
    placeId: 'place-id',
    categoryId: 'category-id',
    name: 'Noodles',
    description: null,
    type: 'FOOD',
    price: new Prisma.Decimal('15000.00'),
    isAvailable: false,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    category: { id: 'category-id', name: 'Food', sortOrder: 0, isActive: true },
    imageAsset: null,
  };
  let repository: Record<string, jest.Mock>;
  let access: { assertPermission: jest.Mock };
  let audit: { append: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let service: MenusService;

  beforeEach(() => {
    repository = {
      findItem: jest.fn().mockResolvedValue(baseItem),
      findCategory: jest.fn().mockResolvedValue({ id: 'category-id' }),
      updateItem: jest.fn().mockResolvedValue(baseItem),
      deleteItemCartRows: jest.fn().mockResolvedValue({ count: 2 }),
      findPlaceState: jest.fn().mockResolvedValue({ isPublished: true, isOrderingEnabled: true }),
      countEligibleItems: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0),
      updatePlaceState: jest.fn().mockResolvedValue({}),
      listPublic: jest.fn(),
    };
    access = {
      assertPermission: jest.fn().mockResolvedValue({
        source: 'platform',
        resourceScope: 'global',
        permission: 'menu.update',
      }),
    };
    audit = { append: jest.fn().mockResolvedValue({}) };
    prisma = {
      $transaction: jest.fn((callback: (client: unknown) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    service = new MenusService(
      repository as never,
      access as never,
      audit as never,
      prisma as never,
    );
  });

  it('purges cart rows and atomically disables ordering after item unavailability', async () => {
    const result = await service.updateItem(actor, 'place-id', 'item-internal', {
      isAvailable: false,
    });
    expect(result).toEqual(expect.objectContaining({ price: 15000, imageUrl: null }));
    expect(repository.deleteItemCartRows).toHaveBeenCalledWith('place-id', 'item-internal', tx);
    expect(repository.updatePlaceState).toHaveBeenCalledWith(
      'place-id',
      { isPublished: true, isOrderingEnabled: false },
      tx,
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ORDERING_SETTING_UPDATED' }),
      tx,
    );
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('unpublishes and disables ordering when no active-category content remains', async () => {
    repository.countEligibleItems = jest.fn().mockResolvedValue(0);
    await service.updateItem(actor, 'place-id', 'item-internal', { isAvailable: false });
    expect(repository.updatePlaceState).toHaveBeenCalledWith(
      'place-id',
      { isPublished: false, isOrderingEnabled: false },
      tx,
    );
  });

  it('groups only the paged public items and counts items rather than groups', async () => {
    repository.listPublic.mockResolvedValue({
      items: [
        { ...baseItem, id: 'one', isAvailable: true },
        { ...baseItem, id: 'two', isAvailable: true },
      ],
      totalItems: 7,
    });
    const result = await service.publicMenu('place-id', { page: 2, limit: 2 });
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].items.map((item) => item.menuItemId)).toEqual(['one', 'two']);
    expect(result.meta).toEqual({ page: 2, limit: 2, totalItems: 7, totalPages: 4 });
  });
});
