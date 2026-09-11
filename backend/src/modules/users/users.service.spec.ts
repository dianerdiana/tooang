import { ConflictException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { UserRoleEnum } from '@/common/auth';

import { UsersService } from './users.service';

describe('UsersService', () => {
  const actor = {
    id: 'actor-internal',
    userId: 'usr_admin',
    fullName: 'Admin',
    email: 'admin@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    roles: [{ role: { code: UserRoleEnum.SuperAdmin } }],
  };
  const target = {
    ...actor,
    id: 'target-internal',
    userId: 'usr_target',
    roles: [{ role: { code: UserRoleEnum.User } }],
  };

  it('rejects revoking an active user last role', async () => {
    const repository = {
      findActiveByPublicId: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(id === actor.userId ? actor : target)),
      findRole: jest.fn().mockResolvedValue({ id: 'role-user', code: 'USER' } as never),
      findRoleAssignment: jest.fn().mockResolvedValue({} as never),
      countRoles: jest.fn().mockResolvedValue(1 as never),
    };
    const prisma = { $transaction: (work: (tx: object) => unknown) => work({}) };
    const service = new UsersService(repository as never, prisma as never);
    await expect(
      service.revokeRole(actor.userId, target.userId, UserRoleEnum.User),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects self-deactivation', async () => {
    const repository = { findActiveByPublicId: jest.fn().mockResolvedValue(actor as never) };
    const prisma = { $transaction: (work: (tx: object) => unknown) => work({}) };
    const service = new UsersService(repository as never, prisma as never);
    await expect(service.deactivate(actor.userId, actor.userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects deactivation of the last active place owner', async () => {
    const owner = {
      ...target,
      roles: [{ role: { code: UserRoleEnum.User } }, { role: { code: UserRoleEnum.Owner } }],
    };
    const repository = {
      findActiveByPublicId: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(id === actor.userId ? actor : owner)),
      findPlaceWithoutAlternateOwner: jest
        .fn()
        .mockResolvedValue({ place: { id: 'place', name: 'Only Owner Cafe' } } as never),
    };
    const prisma = { $transaction: (work: (tx: object) => unknown) => work({}) };
    const service = new UsersService(repository as never, prisma as never);

    await expect(service.deactivate(actor.userId, owner.userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
