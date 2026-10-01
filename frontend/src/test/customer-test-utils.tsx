import { Fragment, type ReactElement, useEffect } from 'react';

import { vi } from 'vitest';

import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query';
import {
  type AnyRoute,
  type AnyRouter,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { AppAbilityProvider } from '@/utils/context/ability-context';
import { AuthContextProvider } from '@/utils/context/auth-context';
import type { Theme } from '@/utils/context/theme-context';
import { ThemeProvider } from '@/utils/context/theme-context';
import { createAbilityForUser } from '@/utils/create-ability';
import { useAppAbility } from '@/utils/hooks/use-app-ability';
import { useAuth } from '@/utils/hooks/use-auth';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { blockUnexpectedApiRequests } from './mock-boundaries';
import { registerTestQueryClient } from './test-resources';

import type { RouterContext } from '@/router';

type QuerySeed = readonly [queryKey: QueryKey, data: unknown];

type RenderTarget =
  | { component: ReactElement; routeTree?: never; routePath?: string }
  | { component?: never; routeTree: AnyRoute; routePath?: never };

export type CustomerRenderOptions = RenderTarget & {
  initialEntry: string;
  queryClient?: QueryClient;
  querySeeds?: readonly QuerySeed[];
  session: AuthenticatedUser | null;
  theme: Theme;
};

export type CustomerRenderResult = RenderResult & {
  actor: UserEvent;
  queryClient: QueryClient;
  router: AnyRouter;
};

export function createTestQueryClient() {
  return registerTestQueryClient(
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
          refetchOnWindowFocus: false,
        },
        mutations: { retry: false },
      },
    }),
  );
}

function createComponentRouteTree(component: ReactElement, routePath = '/') {
  const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });
  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: routePath,
    component: () => <Fragment>{component}</Fragment>,
  });
  return rootRoute.addChildren([testRoute]);
}

function RouterBridge({ router, queryClient }: { router: AnyRouter; queryClient: QueryClient }) {
  const ability = useAppAbility();
  const { isAuthenticated, isInitialLoading, user } = useAuth();

  useEffect(() => {
    void router.invalidate();
  }, [isAuthenticated, isInitialLoading, router, user]);

  if (isInitialLoading) return <div role='status'>Loading session</div>;

  return (
    <RouterProvider
      router={router}
      context={{ queryClient, auth: { isAuthenticated, isInitialLoading, user }, ability }}
    />
  );
}

export function renderWithCustomerProviders(options: CustomerRenderOptions): CustomerRenderResult {
  blockUnexpectedApiRequests();

  const queryClient = options.queryClient ?? createTestQueryClient();
  registerTestQueryClient(queryClient);
  queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, options.session);
  for (const [queryKey, data] of options.querySeeds ?? []) queryClient.setQueryData(queryKey, data);

  const ability = createAbilityForUser(options.session);
  const routeTree = options.routeTree ?? createComponentRouteTree(options.component, options.routePath);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [options.initialEntry] }),
    context: {
      queryClient,
      auth: {
        isAuthenticated: options.session !== null,
        isInitialLoading: false,
        user: options.session,
      },
      ability,
    },
  });

  const actor = vi.isFakeTimers()
    ? userEvent.setup({ advanceTimers: (delay) => vi.advanceTimersByTime(delay) })
    : userEvent.setup();
  const rendered = render(
    <ThemeProvider defaultTheme={options.theme} storageKey='tooang.test.theme'>
      <QueryClientProvider client={queryClient}>
        <AuthContextProvider>
          <AppAbilityProvider>
            <RouterBridge router={router} queryClient={queryClient} />
          </AppAbilityProvider>
        </AuthContextProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );

  return { ...rendered, actor, queryClient, router };
}
