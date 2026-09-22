import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { placesKeys } from '@/features/places/queries/places.key';

import { cacheCreatedMenuItem, cacheDeletedMenuItem, cacheUpdatedMenuItem } from './menu-items.mutation';
import { menuItemsKeys } from './menu-items.query';

const item = {
  menuItemId: 'item-1',
  placeId: 'place-1',
  categoryId: 'category-1',
  name: 'Tea',
  description: null,
  type: 'DRINK' as const,
  price: 5000,
  isAvailable: true,
  sortOrder: 0,
  imageUrl: null,
  createdAt: '',
  updatedAt: '',
};

describe('menu-item query cache', () => {
  it('isolates lists by place and filters', () => {
    expect(menuItemsKeys.list('place-1', { type: 'FOOD' })).not.toEqual(
      menuItemsKeys.list('place-2', { type: 'FOOD' }),
    );
    expect(menuItemsKeys.list('place-1', { type: 'FOOD' })).not.toEqual(
      menuItemsKeys.list('place-1', { type: 'DRINK' }),
    );
  });

  it('maintains item and place caches after mutations', async () => {
    const client = new QueryClient();
    const list = menuItemsKeys.list('place-1', {});
    client.setQueryData(list, { items: [], meta: {} });
    await cacheCreatedMenuItem(client, 'place-1', item);
    expect(client.getQueryData(menuItemsKeys.detail('place-1', 'item-1'))).toEqual(item);
    expect(client.getQueryState(list)?.isInvalidated).toBe(true);
    client.setQueryData(placesKeys.managementDetail('place-1'), {});
    await cacheUpdatedMenuItem(client, 'place-1', { ...item, isAvailable: false });
    expect(client.getQueryState(placesKeys.managementDetail('place-1'))?.isInvalidated).toBe(true);
    await cacheDeletedMenuItem(client, 'place-1', 'item-1');
    expect(client.getQueryData(menuItemsKeys.detail('place-1', 'item-1'))).toBeUndefined();
  });
});
