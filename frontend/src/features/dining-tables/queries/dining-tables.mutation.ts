import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { diningTablesService } from '../services/dining-tables.service';
import type { CreateDiningTableInput, UpdateDiningTableInput } from '../types/dining-tables.type';

import { diningTablesKeys } from './dining-tables.query';

export const cacheCreatedDiningTable = async (
  queryClient: QueryClient,
  placeId: string,
  table: Awaited<ReturnType<typeof diningTablesService.create>>,
) => {
  queryClient.setQueryData(diningTablesKeys.detail(placeId, table.tableId), table);
  await queryClient.invalidateQueries({ queryKey: diningTablesKeys.list(placeId) });
};

export const cacheUpdatedDiningTable = async (
  queryClient: QueryClient,
  placeId: string,
  table: Awaited<ReturnType<typeof diningTablesService.update>>,
) => {
  queryClient.setQueryData(diningTablesKeys.detail(placeId, table.tableId), table);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: diningTablesKeys.list(placeId) }),
    queryClient.invalidateQueries({ queryKey: diningTablesKeys.detail(placeId, table.tableId) }),
  ]);
};

export const cacheDeletedDiningTable = async (queryClient: QueryClient, placeId: string, tableId: string) => {
  queryClient.removeQueries({ queryKey: diningTablesKeys.detail(placeId, tableId), exact: true });
  await queryClient.invalidateQueries({ queryKey: diningTablesKeys.list(placeId) });
};

export const useCreateDiningTableMutation = (placeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiningTableInput) => diningTablesService.create(placeId, input),
    onSuccess: (table) => cacheCreatedDiningTable(queryClient, placeId, table),
  });
};

export const useUpdateDiningTableMutation = (placeId: string, tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDiningTableInput) => diningTablesService.update(placeId, tableId, input),
    onSuccess: (table) => cacheUpdatedDiningTable(queryClient, placeId, table),
  });
};

export const useDeleteDiningTableMutation = (placeId: string, tableId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => diningTablesService.remove(placeId, tableId),
    onSuccess: () => cacheDeletedDiningTable(queryClient, placeId, tableId),
  });
};
