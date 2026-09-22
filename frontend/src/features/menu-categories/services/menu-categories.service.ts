import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizeMenuCategoryListParams } from '../schemas/menu-categories.schema';
import type {
  CreateMenuCategoryInput,
  MenuCategory,
  MenuCategoryListParams,
  MenuCategoryListResult,
  UpdateMenuCategoryInput,
} from '../types/menu-categories.type';

export const menuCategoriesService = {
  async list(placeId: string, params: MenuCategoryListParams): Promise<MenuCategoryListResult> {
    try {
      const response = await api.get<ApiPaginatedResponse<{ categories: MenuCategory[] }>>(
        `/places/${placeId}/menu-categories`,
        { params: normalizeMenuCategoryListParams(params) },
      );
      const result = unwrapPaginatedApiResponse(response.data);
      return { categories: result.items.categories, meta: result.meta };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async get(placeId: string, categoryId: string): Promise<MenuCategory> {
    try {
      const response = await api.get<ApiResponse<{ category: MenuCategory }>>(
        `/places/${placeId}/menu-categories/${categoryId}`,
      );
      return unwrapApiResponse(response.data).category;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async create(placeId: string, input: CreateMenuCategoryInput): Promise<MenuCategory> {
    try {
      const response = await api.post<CreateMenuCategoryInput, ApiResponse<{ category: MenuCategory }>>(
        `/places/${placeId}/menu-categories`,
        input,
      );
      return unwrapApiResponse(response.data).category;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, categoryId: string, input: UpdateMenuCategoryInput): Promise<MenuCategory> {
    try {
      const response = await api.patch<UpdateMenuCategoryInput, ApiResponse<{ category: MenuCategory }>>(
        `/places/${placeId}/menu-categories/${categoryId}`,
        input,
      );
      return unwrapApiResponse(response.data).category;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(placeId: string, categoryId: string): Promise<MenuCategory> {
    try {
      const response = await api.delete<ApiResponse<{ category: MenuCategory }>>(
        `/places/${placeId}/menu-categories/${categoryId}`,
      );
      return unwrapApiResponse(response.data).category;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
