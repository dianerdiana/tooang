import { jest } from '@jest/globals';

import { PlacesRepository } from './places.repository';

describe('PlacesRepository predicates', () => {
  it('bounds discovery in the service schema and queries only published active places', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest.fn(() => Promise.resolve(0));
    const prisma = {
      place: { findMany, count },
      $transaction: jest.fn(() => Promise.resolve([[], 0])),
    };
    const repository = new PlacesRepository(prisma as never);
    await repository.listPublic({
      page: 2,
      limit: 20,
      search: 'coffee',
      type: 'CAFE',
      city: 'Bandung',
    });

    const query = findMany.mock.calls[0]?.[0] as unknown as {
      where: Record<string, unknown>;
      orderBy: object[];
      skip: number;
      take: number;
    };
    expect(query.where).toMatchObject({ isPublished: true, deletedAt: null, type: 'CAFE' });
    expect(query.where).toHaveProperty('OR');
    expect(query.where).toHaveProperty('city', { equals: 'Bandung', mode: 'insensitive' });
    expect(query.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    expect(query.skip).toBe(20);
    expect(query.take).toBe(20);
  });

  it('lists active management places without hiding drafts', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest.fn(() => Promise.resolve(0));
    const prisma = {
      place: { findMany, count },
      $transaction: jest.fn(() => Promise.resolve([[], 0])),
    };
    const repository = new PlacesRepository(prisma as never);

    await repository.listManagement({ page: 1, limit: 20, search: 'Bandung' });

    const query = findMany.mock.calls[0]?.[0] as unknown as {
      where: Record<string, unknown>;
      orderBy: object[];
    };
    expect(query.where).toMatchObject({ deletedAt: null });
    expect(query.where).not.toHaveProperty('isPublished');
    expect(query.where).toHaveProperty('OR');
    expect(query.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('treats only active workflow orders and unexpired pending orders as unresolved', async () => {
    const count = jest.fn(() => Promise.resolve(0));
    const db = { order: { count } };
    const repository = new PlacesRepository(db as never);
    const now = new Date('2026-09-14T00:00:00Z');
    await repository.countUnresolvedOrders('place-id', now, db as never);
    expect(count).toHaveBeenCalledWith({
      where: {
        placeId: 'place-id',
        OR: [
          { status: { in: ['CONFIRMED', 'PREPARING', 'READY'] } },
          { status: 'PENDING', expiresAt: { gt: now } },
        ],
      },
    });
  });

  it('scopes dining-table lookups by both place and child ID and excludes deleted rows', async () => {
    const findFirst = jest.fn(() => Promise.resolve(null));
    const db = { diningTable: { findFirst } };
    const repository = new PlacesRepository(db as never);
    await repository.findDiningTable('place-a', 'table-b', true, db as never);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'table-b',
          placeId: 'place-a',
          deletedAt: null,
          isActive: true,
        },
      }),
    );
  });
});
