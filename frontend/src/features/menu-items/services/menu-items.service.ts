import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizeMenuItemListParams } from '../schemas/menu-items.schema';
import type {
  CreateMenuItemInput,
  MenuItem,
  MenuItemListParams,
  MenuItemListResult,
  UpdateMenuItemInput,
} from '../types/menu-items.type';

export const menuItemsService = {
  async list(placeId: string, params: MenuItemListParams): Promise<MenuItemListResult> {
    try {
      const response = await api.get<ApiPaginatedResponse<{ items: MenuItem[] }>>(`/places/${placeId}/menu-items`, {
        params: normalizeMenuItemListParams(params),
      });
      const result = unwrapPaginatedApiResponse(response.data);
      return { items: result.items.items, meta: result.meta };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async get(placeId: string, menuItemId: string): Promise<MenuItem> {
    try {
      const response = await api.get<ApiResponse<{ menuItem: MenuItem }>>(
        `/places/${placeId}/menu-items/${menuItemId}`,
      );
      return unwrapApiResponse(response.data).menuItem;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async create(placeId: string, input: CreateMenuItemInput): Promise<MenuItem> {
    try {
      const response = await api.post<CreateMenuItemInput, ApiResponse<{ menuItem: MenuItem }>>(
        `/places/${placeId}/menu-items`,
        input,
      );
      return unwrapApiResponse(response.data).menuItem;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, menuItemId: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    try {
      const response = await api.patch<UpdateMenuItemInput, ApiResponse<{ menuItem: MenuItem }>>(
        `/places/${placeId}/menu-items/${menuItemId}`,
        input,
      );
      return unwrapApiResponse(response.data).menuItem;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(placeId: string, menuItemId: string): Promise<MenuItem> {
    try {
      const response = await api.delete<ApiResponse<{ menuItem: MenuItem }>>(
        `/places/${placeId}/menu-items/${menuItemId}`,
      );
      return unwrapApiResponse(response.data).menuItem;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
