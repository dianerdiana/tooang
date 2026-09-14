import { jest } from '@jest/globals';

import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  it('loads /me with active lifecycle and membership predicates only', async () => {
    const findFirst = jest.fn(() => Promise.resolve(null));
    const repository = new UsersRepository({ user: { findFirst } } as never);

    await repository.findMe('internal-user-id');

    const query = findFirst.mock.calls[0]?.[0] as unknown as {
      where: unknown;
      select: Record<string, unknown> & { placeMemberships: unknown };
    };
    expect(query.where).toEqual({
      id: 'internal-user-id',
      deletedAt: null,
      deletionRequestedAt: null,
      anonymizedAt: null,
    });
    expect(query.select.placeMemberships).toEqual({
      where: { revokedAt: null, place: { deletedAt: null } },
      select: { placeId: true, role: true },
      orderBy: { placeId: 'asc' },
    });
    expect(query.select).not.toHaveProperty('id');
    expect(query.select).not.toHaveProperty('passwordHash');
    expect(query.select).not.toHaveProperty('deletedAt');
  });

  it('conditionally updates only an active profile and selects public fields', async () => {
    const update = jest.fn(() => Promise.resolve({}));
    const repository = new UsersRepository({ user: { update } } as never);

    await repository.updateProfile('internal-user-id', { fullName: 'Dian' });

    expect(update).toHaveBeenCalledWith({
      where: {
        id: 'internal-user-id',
        deletedAt: null,
        deletionRequestedAt: null,
        anonymizedAt: null,
      },
      data: { fullName: 'Dian' },
      select: {
        userId: true,
        fullName: true,
        email: true,
        platformRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('lists active users with bounded input and a stable secondary order', async () => {
    const findMany = jest.fn(() => Promise.resolve([]));
    const count = jest.fn(() => Promise.resolve(0));
    const transaction = jest.fn((operations: Promise<unknown>[]) => Promise.all(operations));
    const repository = new UsersRepository({
      user: { findMany, count },
      $transaction: transaction,
    } as never);

    await repository.list({ page: 2, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
        skip: 20,
        take: 20,
        orderBy: [{ createdAt: 'desc' }, { userId: 'asc' }],
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
