import { NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { PlaceMemberRole, PlatformRole } from '@/generated/prisma/client';

import { DiningTablesService } from './dining-tables.service';

const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: PlatformRole.USER };
const table = {
  id: 'table-id',
  placeId: 'place-id',
  name: 'VIP Table',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('DiningTablesService', () => {
  it('limits CASHIER reads to active tables', async () => {
    const repository = { listDiningTables: jest.fn(() => Promise.resolve([table])) };
    const access = {
      assertPermission: jest.fn(() =>
        Promise.resolve({ source: 'membership', membershipRole: PlaceMemberRole.CASHIER }),
      ),
    };
    const service = new DiningTablesService(
      repository as never,
      access as never,
      {} as never,
      {} as never,
    );
    await service.list(actor, table.placeId);
    expect(repository.listDiningTables).toHaveBeenCalledWith(table.placeId, true);
  });

  it('hides a foreign-place table as not found', async () => {
    const repository = { findDiningTable: jest.fn(() => Promise.resolve(null)) };
    const access = {
      assertPermission: jest.fn(() =>
        Promise.resolve({ source: 'membership', membershipRole: PlaceMemberRole.OWNER }),
      ),
    };
    const service = new DiningTablesService(
      repository as never,
      access as never,
      {} as never,
      {} as never,
    );
    await expect(service.get(actor, table.placeId, table.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
