import { queryOptions } from '@tanstack/react-query';

import { diningTablesService } from '../services/dining-tables.service';

export const diningTablesKeys = {
  all: ['dining-tables'] as const,
  place: (placeId: string) => [...diningTablesKeys.all, placeId] as const,
  list: (placeId: string) => [...diningTablesKeys.place(placeId), 'list'] as const,
  detail: (placeId: string, tableId: string) => [...diningTablesKeys.place(placeId), 'detail', tableId] as const,
};

export const diningTablesQueryOptions = (placeId: string) =>
  queryOptions({
    queryKey: diningTablesKeys.list(placeId),
    queryFn: () => diningTablesService.list(placeId),
    staleTime: 15_000,
  });

export const diningTableQueryOptions = (placeId: string, tableId: string) =>
  queryOptions({
    queryKey: diningTablesKeys.detail(placeId, tableId),
    queryFn: () => diningTablesService.get(placeId, tableId),
    staleTime: 15_000,
  });
