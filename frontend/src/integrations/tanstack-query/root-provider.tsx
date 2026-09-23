import React from 'react';

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryFunctionContext,
  type QueryKey,
} from '@tanstack/react-query';

import { api } from '@/configs/api-config';

import { isApplicationError, toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

export const defaultQueryFn = async ({ queryKey }: QueryFunctionContext<QueryKey>) => {
  try {
    const [endpoint, params] = queryKey;

    if (typeof endpoint !== 'string') {
      throw new Error('The first query key item must be an API-relative endpoint string');
    }

    const res = await api.get<ApiResponse<unknown>>(endpoint, { params });
    return unwrapApiResponse(res.data);
  } catch (error) {
    throw toApiError(error);
  }
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isApplicationError(error) && error.httpStatus === 409) {
        void queryClient.invalidateQueries({ refetchType: 'active' });
      }
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      // Data remains fresh for 5 minutes (won't refetch in background)
      staleTime: 1000 * 60 * 5,

      // Data stays in memory for 10 minutes after being unused
      gcTime: 1000 * 60 * 10,

      // Disable automatic refetch on window focus globally
      refetchOnWindowFocus: false,

      retry: (failureCount, error) => {
        if (error.httpStatus && error.httpStatus >= 400 && error.httpStatus < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function TanstackQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
