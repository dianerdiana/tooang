import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

const defaultQueryFn = async ({ queryKey }: { queryKey: any }) => {
  try {
    const res = await api.get(queryKey[0], { params: queryKey[1] });
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

      // Retry failed queries twice instead of the default 3
      retry: 2,
    },
  },
});

export default function TanstackQueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
