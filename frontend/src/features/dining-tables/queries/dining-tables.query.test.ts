import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { cacheCreatedDiningTable, cacheDeletedDiningTable, cacheUpdatedDiningTable } from './dining-tables.mutation';
import { diningTablesKeys } from './dining-tables.query';

const table = {
  tableId: 'table-1',
  placeId: 'place-1',
  name: 'Main Hall',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('dining-table query cache', () => {
  it('isolates list and detail caches by place and table', () => {
    expect(diningTablesKeys.list('place-1')).not.toEqual(diningTablesKeys.list('place-2'));
    expect(diningTablesKeys.detail('place-1', 'table-1')).not.toEqual(diningTablesKeys.detail('place-1', 'table-2'));
  });

  it('stores detail data and invalidates the collection after create/update', async () => {
    const client = new QueryClient();
    client.setQueryData(diningTablesKeys.list('place-1'), []);
    await cacheCreatedDiningTable(client, 'place-1', table);
    expect(client.getQueryData(diningTablesKeys.detail('place-1', 'table-1'))).toEqual(table);
    expect(client.getQueryState(diningTablesKeys.list('place-1'))?.isInvalidated).toBe(true);

    client.setQueryData(diningTablesKeys.list('place-1'), [table]);
    const updated = { ...table, name: 'Patio' };
    await cacheUpdatedDiningTable(client, 'place-1', updated);
    expect(client.getQueryData(diningTablesKeys.detail('place-1', 'table-1'))).toEqual(updated);
    expect(client.getQueryState(diningTablesKeys.detail('place-1', 'table-1'))?.isInvalidated).toBe(true);
  });

  it('removes detail data and invalidates the collection after delete', async () => {
    const client = new QueryClient();
    client.setQueryData(diningTablesKeys.list('place-1'), [table]);
    client.setQueryData(diningTablesKeys.detail('place-1', 'table-1'), table);
    await cacheDeletedDiningTable(client, 'place-1', 'table-1');
    expect(client.getQueryData(diningTablesKeys.detail('place-1', 'table-1'))).toBeUndefined();
    expect(client.getQueryState(diningTablesKeys.list('place-1'))?.isInvalidated).toBe(true);
  });
});
