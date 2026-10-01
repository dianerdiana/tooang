import type { QueryClient } from '@tanstack/react-query';

const queryClients = new Set<QueryClient>();
const cleanupCallbacks = new Set<() => void>();

export function registerTestQueryClient(queryClient: QueryClient) {
  queryClients.add(queryClient);
  return queryClient;
}

export function registerTestCleanup(callback: () => void) {
  cleanupCallbacks.add(callback);
  return callback;
}

export function resetTestResources() {
  for (const callback of [...cleanupCallbacks].reverse()) callback();
  cleanupCallbacks.clear();

  for (const queryClient of queryClients) queryClient.clear();
  queryClients.clear();
}
