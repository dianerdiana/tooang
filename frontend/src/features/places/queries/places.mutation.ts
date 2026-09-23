import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { placesService } from '../services/places.service';
import type {
  PlaceCreateInput,
  PlaceOrderingInput,
  PlacePublishingInput,
  PlaceUpdateInput,
} from '../types/places.type';

import { placesKeys } from './places.key';

export const cachePlaceMutation = async (
  queryClient: QueryClient,
  place: Awaited<ReturnType<typeof placesService.update>>,
) => {
  queryClient.setQueryData(placesKeys.managementDetail(place.id), place);
  await queryClient.invalidateQueries({ queryKey: placesKeys.management() });
};

export const useCreatePlaceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceCreateInput) => placesService.create(input),
    onSuccess: (place) => cachePlaceMutation(queryClient, place),
  });
};

export const useUpdatePlaceMutation = (placeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PlaceUpdateInput) => placesService.update(placeId, input),
    onSuccess: (place) => cachePlaceMutation(queryClient, place),
  });
};

const usePlaceStateMutation = <TInput>(
  mutationFn: (input: TInput) => ReturnType<typeof placesService.setPublishing>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (place) => cachePlaceMutation(queryClient, place),
  });
};

export const useSetPlacePublishingMutation = (placeId: string) =>
  usePlaceStateMutation<PlacePublishingInput>((input) => placesService.setPublishing(placeId, input));

export const useSetPlaceOrderingMutation = (placeId: string) =>
  usePlaceStateMutation<PlaceOrderingInput>((input) => placesService.setOrdering(placeId, input));
