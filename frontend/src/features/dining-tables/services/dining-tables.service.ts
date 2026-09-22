import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import type { CreateDiningTableInput, DiningTable, UpdateDiningTableInput } from '../types/dining-tables.type';

export const diningTablesService = {
  async list(placeId: string): Promise<DiningTable[]> {
    try {
      const response = await api.get<ApiResponse<{ tables: DiningTable[] }>>(`/places/${placeId}/dining-tables`);
      return unwrapApiResponse(response.data).tables;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async get(placeId: string, tableId: string): Promise<DiningTable> {
    try {
      const response = await api.get<ApiResponse<{ table: DiningTable }>>(
        `/places/${placeId}/dining-tables/${tableId}`,
      );
      return unwrapApiResponse(response.data).table;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async create(placeId: string, input: CreateDiningTableInput): Promise<DiningTable> {
    try {
      const response = await api.post<CreateDiningTableInput, ApiResponse<{ table: DiningTable }>>(
        `/places/${placeId}/dining-tables`,
        input,
      );
      return unwrapApiResponse(response.data).table;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, tableId: string, input: UpdateDiningTableInput): Promise<DiningTable> {
    try {
      const response = await api.patch<UpdateDiningTableInput, ApiResponse<{ table: DiningTable }>>(
        `/places/${placeId}/dining-tables/${tableId}`,
        input,
      );
      return unwrapApiResponse(response.data).table;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(placeId: string, tableId: string): Promise<DiningTable> {
    try {
      const response = await api.delete<ApiResponse<{ table: DiningTable }>>(
        `/places/${placeId}/dining-tables/${tableId}`,
      );
      return unwrapApiResponse(response.data).table;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
