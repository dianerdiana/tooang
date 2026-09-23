import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizeUserListParams } from '../schemas/users.schema';
import type { UserDeactivationResult, UserListParams, UserListResult, UserSummary } from '../types/users.type';

export const usersService = {
  async list(params: UserListParams): Promise<UserListResult> {
    try {
      const response = await api.get<ApiPaginatedResponse<{ users: UserSummary[] }>>('/users', {
        params: normalizeUserListParams(params),
      });
      const result = unwrapPaginatedApiResponse(response.data);
      return { users: result.items.users, meta: result.meta };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async deactivate(userId: string): Promise<UserDeactivationResult> {
    try {
      const response = await api.delete<ApiResponse<UserDeactivationResult>>(`/users/${userId}`);
      return unwrapApiResponse(response.data);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
