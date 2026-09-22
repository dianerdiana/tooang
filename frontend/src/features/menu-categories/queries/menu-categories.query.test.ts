import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { placesKeys } from '@/features/places/queries/places.key';

import {
  cacheCreatedMenuCategory,
  cacheDeletedMenuCategory,
  cacheUpdatedMenuCategory,
} from './menu-categories.mutation';
import { menuCategoriesKeys } from './menu-categories.query';

const category = {
  categoryId: 'category-1',
  placeId: 'place-1',
  name: 'Drinks',
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('menu-category query cache', () => {
  it('isolates list caches by place, page, page size, and status', () => {
    expect(menuCategoriesKeys.list('place-1', { page: 1, limit: 20 })).not.toEqual(
      menuCategoriesKeys.list('place-1', { page: 2, limit: 20 }),
    );
    expect(menuCategoriesKeys.list('place-1', { page: 1, limit: 20, isActive: true })).not.toEqual(
      menuCategoriesKeys.list('place-1', { page: 1, limit: 20, isActive: false }),
    );
  });

  it('updates detail caches and invalidates targeted lists', async () => {
    const client = new QueryClient();
    const listKey = menuCategoriesKeys.list('place-1', { page: 1, limit: 20 });
    client.setQueryData(listKey, { categories: [], meta: {} });
    await cacheCreatedMenuCategory(client, 'place-1', category);
    expect(client.getQueryData(menuCategoriesKeys.detail('place-1', 'category-1'))).toEqual(category);
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(true);

    client.setQueryData(placesKeys.managementDetail('place-1'), { id: 'place-1' });
    await cacheUpdatedMenuCategory(client, 'place-1', { ...category, isActive: false });
    expect(client.getQueryState(placesKeys.managementDetail('place-1'))?.isInvalidated).toBe(true);
  });

  it('removes deleted details and invalidates place state', async () => {
    const client = new QueryClient();
    client.setQueryData(menuCategoriesKeys.detail('place-1', 'category-1'), category);
    client.setQueryData(placesKeys.managementDetail('place-1'), { id: 'place-1' });
    await cacheDeletedMenuCategory(client, 'place-1', 'category-1');
    expect(client.getQueryData(menuCategoriesKeys.detail('place-1', 'category-1'))).toBeUndefined();
    expect(client.getQueryState(placesKeys.managementDetail('place-1'))?.isInvalidated).toBe(true);
  });
});
