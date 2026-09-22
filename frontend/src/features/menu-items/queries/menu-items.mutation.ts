import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { menuCategoriesKeys } from '@/features/menu-categories/queries/menu-categories.query';
import { placesKeys } from '@/features/places/queries/places.key';

import { menuItemsService } from '../services/menu-items.service';
import type { CreateMenuItemInput, MenuItem, UpdateMenuItemInput } from '../types/menu-items.type';

import { menuItemsKeys } from './menu-items.query';

export const cacheCreatedMenuItem = async (client: QueryClient, placeId: string, item: MenuItem) => {
  client.setQueryData(menuItemsKeys.detail(placeId, item.menuItemId), item);
  await Promise.all([
    client.invalidateQueries({ queryKey: menuItemsKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
  ]);
};

export const cacheUpdatedMenuItem = async (client: QueryClient, placeId: string, item: MenuItem) => {
  client.setQueryData(menuItemsKeys.detail(placeId, item.menuItemId), item);
  await Promise.all([
    client.invalidateQueries({ queryKey: menuItemsKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: menuItemsKeys.detail(placeId, item.menuItemId) }),
    client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: placesKeys.managementDetail(placeId) }),
  ]);
};

export const cacheDeletedMenuItem = async (client: QueryClient, placeId: string, menuItemId: string) => {
  client.removeQueries({ queryKey: menuItemsKeys.detail(placeId, menuItemId), exact: true });
  await Promise.all([
    client.invalidateQueries({ queryKey: menuItemsKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: placesKeys.managementDetail(placeId) }),
  ]);
};

export const useCreateMenuItemMutation = (placeId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => menuItemsService.create(placeId, input),
    onSuccess: (item) => cacheCreatedMenuItem(client, placeId, item),
  });
};

export const useUpdateMenuItemMutation = (placeId: string, menuItemId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMenuItemInput) => menuItemsService.update(placeId, menuItemId, input),
    onSuccess: (item) => cacheUpdatedMenuItem(client, placeId, item),
  });
};

export const useDeleteMenuItemMutation = (placeId: string, menuItemId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => menuItemsService.remove(placeId, menuItemId),
    onSuccess: () => cacheDeletedMenuItem(client, placeId, menuItemId),
  });
};
