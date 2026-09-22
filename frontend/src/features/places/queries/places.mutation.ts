import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placesService } from '../services/places.service';
import type { PlaceCreateInput, PlaceUpdateInput } from '../types/places.type';

import { placesKeys } from './places.key';

export const useCreatePlaceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceCreateInput) => placesService.create(input),
    onSuccess: async (place) => {
      queryClient.setQueryData(placesKeys.managementDetail(place.id), place);
      await queryClient.invalidateQueries({ queryKey: placesKeys.management() });
    },
  });
};

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
