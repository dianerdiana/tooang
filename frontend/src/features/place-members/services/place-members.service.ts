import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import type { PlaceMember, SetCashierInput } from '../types/place-members.type';

export const placeMembersService = {
  async list(placeId: string): Promise<PlaceMember[]> {
    try {
      const response = await api.get<ApiResponse<{ members: PlaceMember[] }>>(`/places/${placeId}/members`);
      return unwrapApiResponse(response.data).members;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async setCashier(placeId: string, userId: string, input: SetCashierInput): Promise<PlaceMember> {
    try {
      const response = await api.put<SetCashierInput, ApiResponse<{ member: PlaceMember }>>(
        `/places/${placeId}/members/${encodeURIComponent(userId)}`,
        input,
      );
      return unwrapApiResponse(response.data).member;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async revoke(placeId: string, userId: string): Promise<PlaceMember> {
    try {
      const response = await api.delete<ApiResponse<{ member: PlaceMember }>>(
        `/places/${placeId}/members/${encodeURIComponent(userId)}`,
      );
      return unwrapApiResponse(response.data).member;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
