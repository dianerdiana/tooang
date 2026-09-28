import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { placesKeys } from '@/features/places/queries/places.key';

import { normalizePublicMenuListParams, normalizePublicMenuPlaceId } from '../../schemas/menu-items.schema';
import { cacheCreatedMenuItem, cacheDeletedMenuItem, cacheUpdatedMenuItem } from '../menu-items.mutation';
import {
  menuItemsKeys,
  publicMenuInfiniteQueryOptions,
  publicMenuKeys,
  publicMenuQueryOptions,
} from '../menu-items.query';

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

describe('public menu contract and query cache', () => {
  const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
  const otherPlaceId = '8f95e179-a74f-46e0-aea8-e796a297c667';
  const categoryId = '123e4567-e89b-12d3-a456-426614174000';

  it('normalizes only supported public filters', () => {
    expect(normalizePublicMenuPlaceId(` ${placeId.toUpperCase()} `)).toBe(placeId);
    expect(normalizePublicMenuListParams({})).toEqual({ page: 1, limit: 20 });
    expect(
      normalizePublicMenuListParams({
        page: '2' as unknown as number,
        limit: 100,
        type: 'DRINK',
        categoryId: categoryId.toUpperCase(),
        search: 'ignored',
        isAvailable: false,
      } as never),
    ).toEqual({ page: 2, limit: 100, type: 'DRINK', categoryId });
    expect(normalizePublicMenuListParams({ page: 0, limit: 101, type: 'INVALID' as 'FOOD' })).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('isolates places, pages, types, and category filters from management keys', () => {
    const food = publicMenuKeys.list(placeId, { page: 1, type: 'FOOD' });
    const drink = publicMenuKeys.list(placeId, { page: 1, type: 'DRINK' });
    const category = publicMenuKeys.list(placeId, { page: 1, type: 'FOOD', categoryId });
    const nextPage = publicMenuKeys.list(placeId, { page: 2, type: 'FOOD' });
    const otherPlace = publicMenuKeys.list(otherPlaceId, { page: 1, type: 'FOOD' });

    expect(food.slice(0, 4)).toEqual(['menu-items', 'public', 'place', placeId]);
    expect(food).not.toEqual(drink);
    expect(food).not.toEqual(category);
    expect(food).not.toEqual(nextPage);
    expect(food).not.toEqual(otherPlace);
    expect(food).not.toEqual(menuItemsKeys.list(placeId, { page: 1, type: 'FOOD' }));
  });

  it('builds public options without cross-key placeholder data', () => {
    const options = publicMenuQueryOptions(placeId, { page: 2, limit: 10, categoryId });

    expect(options.queryKey).toEqual([
      'menu-items',
      'public',
      'place',
      placeId,
      'list',
      { page: 2, limit: 10, categoryId },
    ]);
    expect(options.placeholderData).toBeUndefined();
    expect(options.staleTime).toBe(30_000);
  });

  it('keeps progressive pages inside one place-and-filter scoped infinite cache', () => {
    const options = publicMenuInfiniteQueryOptions(placeId, { limit: 20, type: 'FOOD', categoryId });
    const page = { categories: [], meta: { page: 1, limit: 20, totalItems: 21, totalPages: 2 } };

    expect(options.queryKey).toEqual([
      'menu-items',
      'public',
      'place',
      placeId,
      'infinite',
      { limit: 20, type: 'FOOD', categoryId },
    ]);
    expect(options.getNextPageParam?.(page, [page], 1, [1])).toBe(2);
    expect(options.getNextPageParam?.({ ...page, meta: { ...page.meta, page: 2 } }, [page], 2, [1, 2])).toBeUndefined();
    expect(publicMenuInfiniteQueryOptions(otherPlaceId, { limit: 20, type: 'FOOD' }).queryKey).not.toEqual(
      publicMenuInfiniteQueryOptions(placeId, { limit: 20, type: 'FOOD' }).queryKey,
    );
  });
});
