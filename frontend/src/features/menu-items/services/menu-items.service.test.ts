import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { menuItemsService } from './menu-items.service';

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
