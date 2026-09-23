import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import { setPlaceMemberSchema } from '../schemas/place-members.schema';
import type { PlaceMember, SetPlaceMemberInput } from '../types/place-members.type';

export const placeMembersService = {
  async list(placeId: string): Promise<PlaceMember[]> {
    try {
      const response = await api.get<ApiResponse<{ members: PlaceMember[] }>>(`/places/${placeId}/members`);
      return unwrapApiResponse(response.data).members;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async set(placeId: string, userId: string, input: SetPlaceMemberInput): Promise<PlaceMember> {
    try {
      const body = setPlaceMemberSchema.parse(input);
      const response = await api.put<SetPlaceMemberInput, ApiResponse<{ member: PlaceMember }>>(
        `/places/${placeId}/members/${encodeURIComponent(userId)}`,
        body,
      );
      return unwrapApiResponse(response.data).member;
    } catch (error) {
      throw toApiError(error);
    }
  },

  setCashier(placeId: string, userId: string, input: { role: 'CASHIER' }): Promise<PlaceMember> {
    return this.set(placeId, userId, input);
  },

  setOwner(placeId: string, userId: string, input: { role: 'OWNER' }): Promise<PlaceMember> {
    return this.set(placeId, userId, input);
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
