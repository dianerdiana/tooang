import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { menuItemsService } from '../menu-items.service';

const item = {
  menuItemId: 'item-1',
  placeId: 'place-1',
  categoryId: 'category-1',
  name: 'Tea',
  description: null,
  type: 'DRINK',
  price: 5000,
  isAvailable: true,
  sortOrder: 0,
  imageUrl: null,
  createdAt: '',
  updatedAt: '',
};
const input = {
  categoryId: 'category-1',
  name: 'Tea',
  description: null,
  type: 'DRINK' as const,
  price: 5000,
  isAvailable: true,
  sortOrder: 0,
};
const success = (data: object) => ({ data: { error: false, message: 'Success', data } });

describe('menuItemsService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('scopes list filters to the selected place', async () => {
    const meta = { page: 1, limit: 20, totalItems: 1, totalPages: 1 };
    apiMock.get.mockResolvedValueOnce({
      ...success({ items: [item] }),
      data: { ...success({ items: [item] }).data, meta },
    });
    await expect(menuItemsService.list('place-1', { type: 'DRINK', isAvailable: true })).resolves.toEqual({
      items: [item],
      meta,
    });
    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/menu-items', {
      params: { page: 1, limit: 20, type: 'DRINK', isAvailable: true },
    });
  });

  it('preserves public category grouping, image nullability, sort fields, and item metadata', async () => {
    const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';
    const categoryId = '8F95E179-A74F-46E0-AEA8-E796A297C667';
    const categories = [
      {
        categoryId: categoryId.toLowerCase(),
        name: 'Cold Drinks',
        sortOrder: 2,
        thumbnailUrl: null,
        items: [
          {
            menuItemId: 'menu-item-1',
            categoryId: categoryId.toLowerCase(),
            name: 'Iced Tea',
            description: null,
            type: 'DRINK',
            price: 12000.5,
            isAvailable: true,
            sortOrder: 4,
            imageUrl: null,
          },
          {
            menuItemId: 'menu-item-2',
            categoryId: categoryId.toLowerCase(),
            name: 'Lemon Soda',
            description: 'Fresh lemon and soda',
            type: 'DRINK',
            price: 18000,
            isAvailable: true,
            sortOrder: 5,
            imageUrl: 'https://images.example/menu-item-2.webp',
          },
        ],
      },
    ];
    const meta = { page: 2, limit: 10, totalItems: 12, totalPages: 2 };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Menu retrieved', data: { categories }, meta },
    });

    await expect(
      menuItemsService.listPublicMenu(placeId, {
        page: '2' as unknown as number,
        limit: 10,
        type: 'DRINK',
        categoryId,
      }),
    ).resolves.toEqual({ categories, meta });
    expect(apiMock.get).toHaveBeenCalledWith('/places/5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae/menu', {
      params: { page: 2, limit: 10, type: 'DRINK', categoryId: categoryId.toLowerCase() },
    });
  });

  it('preserves an empty public item page without fabricating categories', async () => {
    const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
    const meta = { page: 3, limit: 20, totalItems: 40, totalPages: 2 };
    apiMock.get.mockResolvedValueOnce({
      data: { error: false, message: 'Menu retrieved', data: { categories: [] }, meta },
    });

    await expect(menuItemsService.listPublicMenu(placeId, { page: 3 })).resolves.toEqual({ categories: [], meta });
  });

  it('normalizes public menu errors', async () => {
    apiMock.get.mockRejectedValueOnce({ error: true, message: 'Place not found', code: 'NOT_FOUND' });

    await expect(menuItemsService.listPublicMenu('5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae', {})).rejects.toMatchObject({
      message: 'Place not found',
      code: 'NOT_FOUND',
      isNetworkError: false,
    });
  });

  it('uses management detail and mutation endpoints', async () => {
    apiMock.get.mockResolvedValueOnce(success({ menuItem: item }));
    apiMock.post.mockResolvedValueOnce(success({ menuItem: item }));
    apiMock.patch.mockResolvedValueOnce(success({ menuItem: item }));
    apiMock.delete.mockResolvedValueOnce(success({ menuItem: item }));
    await menuItemsService.get('place-1', 'item-1');
    await menuItemsService.create('place-1', input);
    await menuItemsService.update('place-1', 'item-1', { price: 6000 });
    await menuItemsService.remove('place-1', 'item-1');
    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/menu-items/item-1');
    expect(apiMock.post).toHaveBeenCalledWith('/places/place-1/menu-items', input);
    expect(apiMock.patch).toHaveBeenCalledWith('/places/place-1/menu-items/item-1', { price: 6000 });
    expect(apiMock.delete).toHaveBeenCalledWith('/places/place-1/menu-items/item-1');
  });
});
