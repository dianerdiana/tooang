import { ConflictException, ForbiddenException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { type AuthenticatedUser, PlatformRoleEnum } from '@/common/auth';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const actor = (platformRole: PlatformRoleEnum): AuthenticatedUser => ({
  id: 'actor-db-id',
  userId: 'usr_actor',
  platformRole,
});

const userRecord = (platformRole = PlatformRoleEnum.User) => ({
  id: 'target-db-id',
  userId: 'usr_target',
  fullName: 'Target User',
  email: 'target@example.com',
  platformRole,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  deletedAt: null,
  deletionRequestedAt: null,
});

describe('UsersService', () => {
  const transactionalPrisma = {
    $transaction: jest.fn((callback: (tx: object) => unknown) => Promise.resolve(callback({}))),
  };

  it('returns platform and membership permissions for /me', async () => {
    const repository = {
      findMe: jest.fn(() =>
        Promise.resolve({
          ...userRecord(),
          placeMemberships: [{ placeId: 'place-1', role: 'CASHIER' }],
        }),
      ),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, transactionalPrisma as never);
    const result = await service.getMe(actor(PlatformRoleEnum.User));

    expect(result.permissions).toContain('profile.read');
    expect(result.placeMemberships[0].permissions).toContain('order.confirm');
    expect(result).not.toHaveProperty('id');
  });

  it('prevents ADMIN from deactivating an ADMIN', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRoleEnum.Admin))),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, transactionalPrisma as never);

    await expect(
      service.deactivate(actor(PlatformRoleEnum.Admin), 'usr_target'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('protects the last active SUPER_ADMIN from demotion', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRoleEnum.SuperAdmin))),
      countActiveSuperAdmins: jest.fn(() => Promise.resolve(1)),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, transactionalPrisma as never);

    await expect(
      service.updatePlatformRole(actor(PlatformRoleEnum.SuperAdmin), 'usr_target', {
        platformRole: 'USER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects deletion while the user is a sole active place owner', async () => {
    const repository = {
      findByInternalId: jest.fn(() => Promise.resolve(userRecord())),
      findSoleOwnedPlace: jest.fn(() => Promise.resolve({ id: 'place-1' })),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, transactionalPrisma as never);

    await expect(service.requestDeletion(actor(PlatformRoleEnum.User))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('calculates bounded list metadata', async () => {
    const repository = {
      list: jest.fn(() => Promise.resolve({ users: [userRecord()], totalItems: 21 })),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, transactionalPrisma as never);
    const result = await service.list({
      page: 2,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.meta).toEqual({ page: 2, limit: 20, totalItems: 21, totalPages: 2 });
  });
});
