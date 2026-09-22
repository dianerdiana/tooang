import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() }));

vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { diningTablesService } from './dining-tables.service';

const table = {
  tableId: 'table-1',
  placeId: 'place-1',
  name: 'Main Hall',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const success = (data: object) => ({ data: { error: false, message: 'Success', data } });

describe('diningTablesService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('uses the unpaginated list and detail endpoints', async () => {
    apiMock.get.mockResolvedValueOnce(success({ tables: [table] })).mockResolvedValueOnce(success({ table }));
    await expect(diningTablesService.list('place-1')).resolves.toEqual([table]);
    await expect(diningTablesService.get('place-1', 'table-1')).resolves.toEqual(table);
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/places/place-1/dining-tables');
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/places/place-1/dining-tables/table-1');
  });

  it('creates, updates, and deletes through the documented endpoints', async () => {
    apiMock.post.mockResolvedValueOnce(success({ table }));
    apiMock.patch.mockResolvedValueOnce(success({ table: { ...table, isActive: false } }));
    apiMock.delete.mockResolvedValueOnce(success({ table: { ...table, isActive: false } }));

    await diningTablesService.create('place-1', { name: 'Main Hall' });
    await diningTablesService.update('place-1', 'table-1', { isActive: false });
    await diningTablesService.remove('place-1', 'table-1');

    expect(apiMock.post).toHaveBeenCalledWith('/places/place-1/dining-tables', { name: 'Main Hall' });
    expect(apiMock.patch).toHaveBeenCalledWith('/places/place-1/dining-tables/table-1', { isActive: false });
    expect(apiMock.delete).toHaveBeenCalledWith('/places/place-1/dining-tables/table-1');
  });

  it('normalizes backend conflicts', async () => {
    apiMock.post.mockRejectedValueOnce({
      error: true,
      message: 'A dining table with that normalized name already exists',
      code: 'CONFLICT',
    });
    await expect(diningTablesService.create('place-1', { name: 'Main Hall' })).rejects.toMatchObject({
      message: 'A dining table with that normalized name already exists',
      isNetworkError: false,
    });
  });
});
