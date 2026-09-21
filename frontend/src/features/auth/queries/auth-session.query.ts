import { type QueryClient, type QueryKey, queryOptions } from '@tanstack/react-query';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { authService } from '../services/auth.service';

export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;

export const authSessionQueryOptions = () =>
  queryOptions({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: async (): Promise<AuthenticatedUser | null> => authService.restoreSession(),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

const isAuthSessionQueryKey = (queryKey: QueryKey) =>
  queryKey[0] === AUTH_SESSION_QUERY_KEY[0] && queryKey[1] === AUTH_SESSION_QUERY_KEY[1];

export const setAuthSession = (queryClient: QueryClient, user: AuthenticatedUser) => {
  queryClient.setQueryData<AuthenticatedUser | null>(AUTH_SESSION_QUERY_KEY, user);
};

export const clearAuthSession = (queryClient: QueryClient) => {
  queryClient.setQueryData<AuthenticatedUser | null>(AUTH_SESSION_QUERY_KEY, null);
  queryClient.removeQueries({ predicate: (query) => !isAuthSessionQueryKey(query.queryKey) });
};
