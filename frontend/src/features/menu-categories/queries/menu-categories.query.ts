import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { normalizeMenuCategoryListParams } from '../schemas/menu-categories.schema';
import { menuCategoriesService } from '../services/menu-categories.service';
import type { MenuCategoryListParams } from '../types/menu-categories.type';

export const menuCategoriesKeys = {
  all: ['menu-categories'] as const,
  place: (placeId: string) => [...menuCategoriesKeys.all, placeId] as const,
  lists: (placeId: string) => [...menuCategoriesKeys.place(placeId), 'list'] as const,
  list: (placeId: string, params: MenuCategoryListParams) =>
    [...menuCategoriesKeys.lists(placeId), normalizeMenuCategoryListParams(params)] as const,
  detail: (placeId: string, categoryId: string) =>
    [...menuCategoriesKeys.place(placeId), 'detail', categoryId] as const,
};

export const menuCategoriesQueryOptions = (placeId: string, params: MenuCategoryListParams) => {
  const normalized = normalizeMenuCategoryListParams(params);
  return queryOptions({
    queryKey: menuCategoriesKeys.list(placeId, normalized),
    queryFn: () => menuCategoriesService.list(placeId, normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

export const menuCategoryQueryOptions = (placeId: string, categoryId: string) =>
  queryOptions({
    queryKey: menuCategoriesKeys.detail(placeId, categoryId),
    queryFn: () => menuCategoriesService.get(placeId, categoryId),
    staleTime: 15_000,
  });

export const allMenuCategoriesQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: [...menuCategoriesKeys.lists(placeId), 'all'] as const,
    queryFn: async () => {
      const categories = [];
      let page = 1;
      while (true) {
        const result = await menuCategoriesService.list(placeId, { page, limit: 100 });
        categories.push(...result.categories);
        if (page >= (result.meta.totalPages ?? 1)) break;
        page += 1;
      }
      return categories;
    },
    staleTime: 15_000,
  });
