import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placesService } from '../services/places.service';
import type {
  PlaceCreateInput,
  PlaceOrderingInput,
  PlacePublishingInput,
  PlaceUpdateInput,
} from '../types/places.type';

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

const usePlaceStateMutation = <TInput>(
  placeId: string,
  mutationFn: (input: TInput) => ReturnType<typeof placesService.setPublishing>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (place) => {
      queryClient.setQueryData(placesKeys.managementDetail(placeId), place);
      await queryClient.invalidateQueries({ queryKey: placesKeys.management() });
    },
  });
};

export const useSetPlacePublishingMutation = (placeId: string) =>
  usePlaceStateMutation<PlacePublishingInput>(placeId, (input) => placesService.setPublishing(placeId, input));

export const useSetPlaceOrderingMutation = (placeId: string) =>
  usePlaceStateMutation<PlaceOrderingInput>(placeId, (input) => placesService.setOrdering(placeId, input));
