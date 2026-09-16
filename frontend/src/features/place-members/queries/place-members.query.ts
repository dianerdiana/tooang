import { queryOptions } from '@tanstack/react-query';

import { placeMembersService } from '../services/place-members.service';

export const placeMembersKeys = {
  all: ['place-members'] as const,
  place: (placeId: string) => [...placeMembersKeys.all, placeId] as const,
  list: (placeId: string) => [...placeMembersKeys.place(placeId), 'list'] as const,
};

export const placeMembersQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: placeMembersKeys.list(placeId),
    queryFn: () => placeMembersService.list(placeId),
    staleTime: 15_000,
  });
