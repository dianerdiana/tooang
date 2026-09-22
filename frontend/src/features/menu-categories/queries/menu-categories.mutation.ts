import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { placesKeys } from '@/features/places/queries/places.key';

import { menuCategoriesService } from '../services/menu-categories.service';
import type { CreateMenuCategoryInput, MenuCategory, UpdateMenuCategoryInput } from '../types/menu-categories.type';

import { menuCategoriesKeys } from './menu-categories.query';

export const cacheCreatedMenuCategory = async (client: QueryClient, placeId: string, category: MenuCategory) => {
  client.setQueryData(menuCategoriesKeys.detail(placeId, category.categoryId), category);
  await client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) });
};

export const cacheUpdatedMenuCategory = async (client: QueryClient, placeId: string, category: MenuCategory) => {
  client.setQueryData(menuCategoriesKeys.detail(placeId, category.categoryId), category);
  await Promise.all([
    client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: menuCategoriesKeys.detail(placeId, category.categoryId) }),
    client.invalidateQueries({ queryKey: placesKeys.managementDetail(placeId) }),
  ]);
};

export const cacheDeletedMenuCategory = async (client: QueryClient, placeId: string, categoryId: string) => {
  client.removeQueries({ queryKey: menuCategoriesKeys.detail(placeId, categoryId), exact: true });
  await Promise.all([
    client.invalidateQueries({ queryKey: menuCategoriesKeys.lists(placeId) }),
    client.invalidateQueries({ queryKey: placesKeys.managementDetail(placeId) }),
  ]);
};

export const useCreateMenuCategoryMutation = (placeId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuCategoryInput) => menuCategoriesService.create(placeId, input),
    onSuccess: (category) => cacheCreatedMenuCategory(client, placeId, category),
  });
};

export const useUpdateMenuCategoryMutation = (placeId: string, categoryId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMenuCategoryInput) => menuCategoriesService.update(placeId, categoryId, input),
    onSuccess: (category) => cacheUpdatedMenuCategory(client, placeId, category),
  });
};

export const useDeleteMenuCategoryMutation = (placeId: string, categoryId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => menuCategoriesService.remove(placeId, categoryId),
    onSuccess: () => cacheDeletedMenuCategory(client, placeId, categoryId),
  });
};
