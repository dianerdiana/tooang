import type { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';

import { ability } from './configs/acl/initial-ability';
import { queryClient } from './integrations/tanstack-query/root-provider';
import type { AppAbility } from './types/ability-rule.type';
import type { AuthenticatedUser } from './types/user-data.type';
import { routeTree } from './routeTree.gen';

export type RouterContext = {
  queryClient: QueryClient;
  auth: {
    isAuthenticated: boolean;
    isInitialLoading: boolean;
    user: AuthenticatedUser | null;
  };
  ability: AppAbility;
};

const defaultRouterContext: RouterContext = {
  queryClient,
  auth: {
    isAuthenticated: false,
    isInitialLoading: true,
    user: null,
  },
  ability,
};

export const router = createRouter({
  routeTree,
  context: defaultRouterContext,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
