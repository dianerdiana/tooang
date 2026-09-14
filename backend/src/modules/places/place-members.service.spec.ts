import { ConflictException, NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import type { PlaceAccessService } from './place-access.service';
import { PlaceMembersService } from './place-members.service';
import type { PlacesRepository } from './places.repository';

const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: PlatformRole.USER };
const target = { id: 'target-id', userId: 'usr_target' };
const ownerMembership = {
  id: 'membership-id',
  placeId: 'place-id',
  role: PlaceMemberRole.OWNER,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  revokedAt: null,
  user: { userId: target.userId, fullName: 'Target', email: 'target@example.com' },
};

describe('PlaceMembersService', () => {
  const prisma = {
    $transaction: jest.fn((callback: (tx: object) => unknown) => Promise.resolve(callback({}))),
  };
  const audit = { append: jest.fn(() => Promise.resolve({})) };

  it('blocks revoking the last active OWNER', async () => {
    const repository = {
      findActiveUser: jest.fn(() => Promise.resolve(target)),
      findMembership: jest.fn(() => Promise.resolve(ownerMembership)),
      countActiveOwners: jest.fn(() => Promise.resolve(1)),
    } as unknown as PlacesRepository;
    const access = { assertPermission: jest.fn(() => Promise.resolve({ scope: 'global' })) };
    const service = new PlaceMembersService(
      repository,
      access as unknown as PlaceAccessService,
      audit as never,
      prisma as never,
    );

    await expect(service.revoke(actor, 'place-id', target.userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('requires both OWNER revocation and CASHIER assignment to demote an owner', async () => {
    const repository = {
      findActiveUser: jest.fn(() => Promise.resolve(target)),
      findMembership: jest.fn(() => Promise.resolve(ownerMembership)),
    } as unknown as PlacesRepository;
    const access = {
      assertPermission: jest
        .fn<() => Promise<{ scope: 'membership' }>>()
        .mockResolvedValueOnce({ scope: 'membership' })
        .mockRejectedValueOnce(new NotFoundException()),
    };
    const service = new PlaceMembersService(
      repository,
      access as unknown as PlaceAccessService,
      audit as never,
      prisma as never,
    );

    await expect(
      service.setRole(actor, 'place-id', target.userId, PlaceMemberRole.CASHIER),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(access.assertPermission).toHaveBeenNthCalledWith(
      1,
      actor,
      'place-id',
      'cashier.assign',
      expect.anything(),
    );
    expect(access.assertPermission).toHaveBeenNthCalledWith(
      2,
      actor,
      'place-id',
      'owner.revoke',
      expect.anything(),
    );
  });

  it('reactivates the existing unique membership row and audits atomically', async () => {
    const revoked = { ...ownerMembership, role: PlaceMemberRole.CASHIER, revokedAt: new Date() };
    const active = { ...revoked, revokedAt: null };
    const setMembership = jest.fn(() => Promise.resolve(active));
    const repository = {
      findActiveUser: jest.fn(() => Promise.resolve(target)),
      findMembership: jest.fn(() => Promise.resolve(revoked)),
      setMembership,
    } as unknown as PlacesRepository;
    const access = { assertPermission: jest.fn(() => Promise.resolve({ scope: 'membership' })) };
    const service = new PlaceMembersService(
      repository,
      access as unknown as PlaceAccessService,
      audit as never,
      prisma as never,
    );

    await service.setRole(actor, 'place-id', target.userId, PlaceMemberRole.CASHIER);
    expect(setMembership).toHaveBeenCalledWith(
      'place-id',
      target.id,
      PlaceMemberRole.CASHIER,
      expect.anything(),
    );
    expect(audit.append).toHaveBeenCalledWith(expect.any(Object), expect.anything());
  });
});
