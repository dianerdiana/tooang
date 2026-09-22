import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { normalizeMenuItemListParams } from '../schemas/menu-items.schema';
import { menuItemsService } from '../services/menu-items.service';
import type { MenuItemListParams } from '../types/menu-items.type';

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
