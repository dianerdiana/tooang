import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import type { BusinessHour, BusinessHourInput, DayOfWeek } from '../types/business-hours.type';

export const businessHoursService = {
  async list(placeId: string): Promise<BusinessHour[]> {
    try {
      const response = await api.get<ApiResponse<{ businessHours: BusinessHour[] }>>(
        `/places/${placeId}/business-hours`,
      );
      return unwrapApiResponse(response.data).businessHours;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, day: DayOfWeek, input: BusinessHourInput): Promise<BusinessHour> {
    try {
      const response = await api.put<BusinessHourInput, ApiResponse<{ businessHour: BusinessHour }>>(
        `/places/${placeId}/business-hours/${day}`,
        input,
      );
      return unwrapApiResponse(response.data).businessHour;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
