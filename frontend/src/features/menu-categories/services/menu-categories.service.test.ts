import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { menuCategoriesService } from './menu-categories.service';

const category = {
  categoryId: 'category-1',
  placeId: 'place-1',
  name: 'Drinks',
  sortOrder: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const meta = { page: 1, limit: 20, totalItems: 1, totalPages: 1 };
const success = (data: object) => ({ data: { error: false, message: 'Success', data } });

describe('menuCategoriesService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('uses server pagination and activation filtering for lists', async () => {
    apiMock.get.mockResolvedValueOnce({
      ...success({ categories: [category] }),
      data: { ...success({ categories: [category] }).data, meta },
    });
    await expect(menuCategoriesService.list('place-1', { page: 1, limit: 20, isActive: true })).resolves.toEqual({
      categories: [category],
      meta,
    });
    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/menu-categories', {
      params: { page: 1, limit: 20, isActive: true },
    });
  });

  it('uses the documented detail and mutation endpoints', async () => {
    apiMock.get.mockResolvedValueOnce(success({ category }));
    apiMock.post.mockResolvedValueOnce(success({ category }));
    apiMock.patch.mockResolvedValueOnce(success({ category: { ...category, isActive: false } }));
    apiMock.delete.mockResolvedValueOnce(success({ category: { ...category, isActive: false } }));

    await menuCategoriesService.get('place-1', 'category-1');
    await menuCategoriesService.create('place-1', { name: 'Drinks', sortOrder: 1, isActive: true });
    await menuCategoriesService.update('place-1', 'category-1', { isActive: false });
    await menuCategoriesService.remove('place-1', 'category-1');

    expect(apiMock.get).toHaveBeenCalledWith('/places/place-1/menu-categories/category-1');
    expect(apiMock.post).toHaveBeenCalledWith('/places/place-1/menu-categories', {
      name: 'Drinks',
      sortOrder: 1,
      isActive: true,
    });
    expect(apiMock.patch).toHaveBeenCalledWith('/places/place-1/menu-categories/category-1', { isActive: false });
    expect(apiMock.delete).toHaveBeenCalledWith('/places/place-1/menu-categories/category-1');
  });

  it('preserves backend conflict messages', async () => {
    apiMock.delete.mockRejectedValueOnce({
      error: true,
      message: 'Menu category still contains menu items',
      code: 'CONFLICT',
    });
    await expect(menuCategoriesService.remove('place-1', 'category-1')).rejects.toMatchObject({
      message: 'Menu category still contains menu items',
      isNetworkError: false,
    });
  });
});
