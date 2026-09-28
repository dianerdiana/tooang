import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query';

import {
  normalizeMenuItemListParams,
  normalizePublicMenuListParams,
  normalizePublicMenuPlaceId,
} from '../schemas/menu-items.schema';
import { menuItemsService } from '../services/menu-items.service';
import type { MenuItemListParams, PublicMenuListParams } from '../types/menu-items.type';

export const publicMenuKeys = {
  all: ['menu-items', 'public'] as const,
  places: () => [...publicMenuKeys.all, 'place'] as const,
  place: (placeId: string) => [...publicMenuKeys.places(), normalizePublicMenuPlaceId(placeId)] as const,
  lists: (placeId: string) => [...publicMenuKeys.place(placeId), 'list'] as const,
  list: (placeId: string, params: PublicMenuListParams) =>
    [...publicMenuKeys.lists(placeId), normalizePublicMenuListParams(params)] as const,
};

export const publicMenuQueryOptions = (placeId: string, params: PublicMenuListParams) => {
  const normalizedPlaceId = normalizePublicMenuPlaceId(placeId);
  const normalized = normalizePublicMenuListParams(params);
  return queryOptions({
    queryKey: publicMenuKeys.list(normalizedPlaceId, normalized),
    queryFn: () => menuItemsService.listPublicMenu(normalizedPlaceId, normalized),
    staleTime: 30_000,
  });
};

export const publicMenuInfiniteQueryOptions = (placeId: string, params: Omit<PublicMenuListParams, 'page'>) => {
  const normalizedPlaceId = normalizePublicMenuPlaceId(placeId);
  const normalized = normalizePublicMenuListParams({ ...params, page: 1 });
  const filters = {
    limit: normalized.limit,
    ...(normalized.type ? { type: normalized.type } : {}),
    ...(normalized.categoryId ? { categoryId: normalized.categoryId } : {}),
  };
  return infiniteQueryOptions({
    queryKey: [...publicMenuKeys.place(normalizedPlaceId), 'infinite', filters] as const,
    queryFn: ({ pageParam }) => menuItemsService.listPublicMenu(normalizedPlaceId, { ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    staleTime: 30_000,
  });
};

export const menuItemsKeys = {
  all: ['menu-items'] as const,
  place: (placeId: string) => [...menuItemsKeys.all, placeId] as const,
  lists: (placeId: string) => [...menuItemsKeys.place(placeId), 'list'] as const,
  list: (placeId: string, params: MenuItemListParams) =>
    [...menuItemsKeys.lists(placeId), normalizeMenuItemListParams(params)] as const,
  detail: (placeId: string, menuItemId: string) => [...menuItemsKeys.place(placeId), 'detail', menuItemId] as const,
};

export const menuItemsQueryOptions = (placeId: string, params: MenuItemListParams) => {
  const normalized = normalizeMenuItemListParams(params);
  return queryOptions({
    queryKey: menuItemsKeys.list(placeId, normalized),
    queryFn: () => menuItemsService.list(placeId, normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

export const menuItemQueryOptions = (placeId: string, menuItemId: string) =>
  queryOptions({
    queryKey: menuItemsKeys.detail(placeId, menuItemId),
    queryFn: () => menuItemsService.get(placeId, menuItemId),
    staleTime: 15_000,
  });
