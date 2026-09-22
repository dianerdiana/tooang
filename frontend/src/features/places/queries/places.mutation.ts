import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placesService } from '../services/places.service';
import type { PlaceUpdateInput } from '../types/places.type';

import { placesKeys } from './places.key';

export const useUpdatePlaceMutation = (placeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceUpdateInput) => placesService.update(placeId, input),
    onSuccess: async (place) => {
      queryClient.setQueryData(placesKeys.managementDetail(placeId), place);
      await queryClient.invalidateQueries({ queryKey: placesKeys.management() });
    },
  });
};
