import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { normalizeUserListParams } from '../schemas/users.schema';
import { platformRoleUpdateSchema } from '../schemas/users.schema';
import type {
  CreateUserInput,
  PlatformRoleUpdateInput,
  UpdateProfileInput,
  UserDeactivationResult,
  UserListParams,
  UserListResult,
  UserSummary,
} from '../types/users.type';

export const usersService = {
  async updateMe(input: UpdateProfileInput): Promise<UserSummary> {
    try {
      const response = await api.patch<UpdateProfileInput, ApiResponse<{ user: UserSummary }>>('/me', input);
      return unwrapApiResponse(response.data).user;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async create(input: CreateUserInput): Promise<UserSummary> {
    try {
      const response = await api.post<CreateUserInput, ApiResponse<{ user: UserSummary }>>('/users', input);
      return unwrapApiResponse(response.data).user;
    } catch (error) {
      throw toApiError(error);
    }
  },

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

  async get(userId: string): Promise<UserSummary> {
    try {
      const response = await api.get<ApiResponse<{ user: UserSummary }>>(`/users/${encodeURIComponent(userId)}`);
      return unwrapApiResponse(response.data).user;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async updatePlatformRole(userId: string, input: PlatformRoleUpdateInput): Promise<UserSummary> {
    try {
      const body = platformRoleUpdateSchema.parse(input);
      const response = await api.put<PlatformRoleUpdateInput, ApiResponse<{ user: UserSummary }>>(
        `/users/${encodeURIComponent(userId)}/platform-role`,
        body,
      );
      return unwrapApiResponse(response.data).user;
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
