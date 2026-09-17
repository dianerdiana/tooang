import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

const defaultQueryFn = async ({ queryKey }: { queryKey: any }) => {
  try {
    const res = await api.get<ApiResponse<unknown>>(queryKey[0], { params: queryKey[1] });
    return unwrapApiResponse(res.data);
  } catch (error) {
    throw toApiError(error);
  }
};

export const queryClient = new QueryClient({
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
