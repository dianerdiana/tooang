import { useMutation, useQueryClient } from '@tanstack/react-query';

import { businessHoursService } from '../services/business-hours.service';
import type { BusinessHourInput, DayOfWeek } from '../types/business-hours.type';

import { businessHoursKeys } from './business-hours.query';

export const useUpdateBusinessHourMutation = (placeId: string, day: DayOfWeek) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BusinessHourInput) => businessHoursService.update(placeId, day, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: businessHoursKeys.place(placeId) });
    },
  });
};
