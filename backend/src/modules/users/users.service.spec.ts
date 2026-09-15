import { ConflictException, ForbiddenException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

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
  anonymizedAt: null,
});

describe('UsersService', () => {
  const transactionClient = {};
  const transactionalPrisma = {
    $transaction: jest.fn((callback: (tx: object) => unknown) =>
      Promise.resolve(callback(transactionClient)),
    ),
  };
  const audit = { append: jest.fn(() => Promise.resolve({})) };

  beforeEach(() => jest.clearAllMocks());

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
    expect(result.placeMemberships[0].effectivePermissions).toEqual(
      result.placeMemberships[0].permissions,
    );
    expect(result).not.toHaveProperty('id');
  });

  it('adds global place capabilities to membership metadata without platform-only capabilities', async () => {
    const repository = {
      findMe: jest.fn(() =>
        Promise.resolve({
          ...userRecord(PlatformRole.ADMIN),
          placeMemberships: [{ placeId: 'place-1', role: 'CASHIER' }],
        }),
      ),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);
    const result = await service.getMe(actor(PlatformRole.ADMIN));

    expect(result.placeMemberships[0].permissions).not.toContain('place.update');
    expect(result.placeMemberships[0].effectivePermissions).toContain('place.update');
    expect(result.placeMemberships[0].effectivePermissions).toContain('review.moderate');
    expect(result.placeMemberships[0].effectivePermissions).not.toContain('user.read');
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

  it('protects the last active SUPER_ADMIN from deactivation', async () => {
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRole.SUPER_ADMIN))),
      countActiveSuperAdmins: jest.fn(() => Promise.resolve(1)),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(
      service.deactivate(actor(PlatformRole.SUPER_ADMIN), 'usr_target'),
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

  it('treats same-role assignment as an idempotent read without a write or audit', async () => {
    const setPlatformRole = jest.fn();
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord(PlatformRole.ADMIN))),
      setPlatformRole,
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    const result = await service.updatePlatformRole(actor(PlatformRole.SUPER_ADMIN), 'usr_target', {
      platformRole: PlatformRole.ADMIN,
    });

    expect(result.platformRole).toBe(PlatformRole.ADMIN);
    expect(setPlatformRole).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
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

  it('rejects a deletion request from the last active SUPER_ADMIN', async () => {
    const repository = {
      findByInternalId: jest.fn(() => Promise.resolve(userRecord(PlatformRole.SUPER_ADMIN))),
      countActiveSuperAdmins: jest.fn(() => Promise.resolve(1)),
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(service.requestDeletion(actor(PlatformRole.SUPER_ADMIN))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('returns an existing deletion request without writes or another audit', async () => {
    const requestedAt = new Date('2026-01-03T00:00:00.000Z');
    const setDeletionRequestedIfActive = jest.fn();
    const revokeSessions = jest.fn();
    const repository = {
      findByInternalId: jest.fn(() =>
        Promise.resolve({ ...userRecord(), deletionRequestedAt: requestedAt }),
      ),
      setDeletionRequestedIfActive,
      revokeSessions,
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await expect(service.requestDeletion(actor(PlatformRole.USER))).resolves.toEqual({
      userId: 'usr_target',
      status: 'DELETION_PENDING',
      deletionRequestedAt: requestedAt.toISOString(),
    });
    expect(setDeletionRequestedIfActive).not.toHaveBeenCalled();
    expect(revokeSessions).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('resolves a serialization conflict to the concurrently accepted deletion request', async () => {
    const requestedAt = new Date('2026-01-03T00:00:00.000Z');
    const writeConflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: 'test',
    });
    const repository = {
      findByInternalId: jest.fn(() =>
        Promise.resolve({ ...userRecord(), deletionRequestedAt: requestedAt }),
      ),
    } as unknown as UsersRepository;
    const prisma = { $transaction: jest.fn(() => Promise.reject(writeConflict)) };
    const service = new UsersService(repository, audit as never, prisma as never);

    await expect(service.requestDeletion(actor(PlatformRole.USER))).resolves.toEqual({
      userId: 'usr_target',
      status: 'DELETION_PENDING',
      deletionRequestedAt: requestedAt.toISOString(),
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('atomically marks deletion pending, revokes sessions, and appends a safe audit event', async () => {
    const setDeletionRequestedIfActive = jest.fn(() => Promise.resolve({ count: 1 }));
    const revokeSessions = jest.fn(() => Promise.resolve({ count: 2 }));
    const repository = {
      findByInternalId: jest.fn(() => Promise.resolve(userRecord())),
      findSoleOwnedPlace: jest.fn(() => Promise.resolve(null)),
      setDeletionRequestedIfActive,
      revokeSessions,
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    const result = await service.requestDeletion(actor(PlatformRole.USER));

    expect(result.status).toBe('DELETION_PENDING');
    expect(setDeletionRequestedIfActive).toHaveBeenCalledWith(
      'target-db-id',
      expect.any(Date),
      transactionClient,
    );
    expect(revokeSessions).toHaveBeenCalledWith(
      'target-db-id',
      expect.any(Date),
      transactionClient,
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { kind: 'USER', userId: 'target-db-id' },
        action: 'ACCOUNT_DELETION_REQUESTED',
        targetId: 'usr_target',
      }),
      transactionClient,
    );
    const deletionAudit = audit.append.mock.calls[0]?.[0] as unknown as {
      afterData?: unknown;
    };
    expect(deletionAudit).not.toHaveProperty('email');
    expect(deletionAudit.afterData).toEqual(
      expect.objectContaining({ status: 'DELETION_PENDING' }),
    );
  });

  it('deactivates, revokes sessions, and audits through one transaction client', async () => {
    const deactivate = jest.fn(() => Promise.resolve(userRecord()));
    const revokeSessions = jest.fn(() => Promise.resolve({ count: 1 }));
    const repository = {
      findActiveByPublicId: jest.fn(() => Promise.resolve(userRecord())),
      findSoleOwnedPlace: jest.fn(() => Promise.resolve(null)),
      deactivate,
      revokeSessions,
    } as unknown as UsersRepository;
    const service = new UsersService(repository, audit as never, transactionalPrisma as never);

    await service.deactivate(actor(PlatformRole.ADMIN), 'usr_target');

    expect(deactivate).toHaveBeenCalledWith('target-db-id', expect.any(Date), transactionClient);
    expect(revokeSessions).toHaveBeenCalledWith(
      'target-db-id',
      expect.any(Date),
      transactionClient,
    );
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_DEACTIVATED',
        beforeData: { platformRole: PlatformRole.USER, deletedAt: null },
      }),
      transactionClient,
    );
    const deactivationAudit = audit.append.mock.calls[0]?.[0] as unknown as {
      afterData?: unknown;
    };
    expect(deactivationAudit.afterData).toEqual(
      expect.objectContaining({ platformRole: PlatformRole.USER }),
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
