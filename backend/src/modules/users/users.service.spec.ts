import { ConflictException, ForbiddenException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { type AuthenticatedUser, PlatformRole, type PlatformRoleType } from '@/common/auth';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const actor = (platformRole: PlatformRoleType): AuthenticatedUser => ({
  id: 'actor-db-id',
  userId: 'usr_actor',
  platformRole,
});

const userRecord = (platformRole: PlatformRoleType = PlatformRole.USER) => ({
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
  const audit = { append: jest.fn(() => Promise.resolve({})) };

  it('returns platform and membership permissions for /me', async () => {
    const repository = {
      findMe: jest.fn(() =>
        Promise.resolve({
          ...userRecord(),
          placeMemberships: [{ placeId: 'place-1', role: 'CASHIER' }],
        }),
      ),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);
    const result = await service.getMe(actor(PlatformRole.USER));

    expect(result.permissions).toContain('profile.read');
    expect(result.permissions).not.toContain('place.read');
    expect(result.permissions).not.toContain('table.read');
    expect(result.permissions).not.toContain('place_member.read');
    expect(result.placeMemberships[0].permissions).toContain('order.confirm');
    expect(result).not.toHaveProperty('id');
  });

  it('prevents ADMIN from deactivating an ADMIN', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRole.ADMIN))),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(
      service.deactivate(actor(PlatformRole.ADMIN), 'usr_target'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents deactivation of the only active owner of an active place', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord())),
      findSoleOwnedPlace: jest.fn(() => Promise.resolve({ id: 'place-1' })),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(
      service.deactivate(actor(PlatformRole.ADMIN), 'usr_target'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('protects the last active SUPER_ADMIN from demotion', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRole.SUPER_ADMIN))),
      countActiveSuperAdmins: jest.fn(() => Promise.resolve(1)),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(
      service.updatePlatformRole(actor(PlatformRole.SUPER_ADMIN), 'usr_target', {
        platformRole: 'USER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects deletion while the user is a sole active place owner', async () => {
    const repository = {
      findByInternalId: jest.fn(() => Promise.resolve(userRecord())),
      findSoleOwnedPlace: jest.fn(() => Promise.resolve({ id: 'place-1' })),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(service.requestDeletion(actor(PlatformRole.USER))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('calculates bounded list metadata', async () => {
    const repository = {
      list: jest.fn(() => Promise.resolve({ users: [userRecord()], totalItems: 21 })),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);
    const result = await service.list({
      page: 2,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.meta).toEqual({ page: 2, limit: 20, totalItems: 21, totalPages: 2 });
  });
});
