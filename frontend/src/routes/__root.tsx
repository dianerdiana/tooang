import React from 'react';

import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import NotFound from '@/components/pages/not-found';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TopLoadingBar } from '@/components/ui/top-loading-bar';

import { env } from '@/configs/env';

import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools';
import TanstackQueryProvider from '@/integrations/tanstack-query/root-provider';

import type { RouterContext } from '../router';

import '../styles.css';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'Frontend' }],
  }),
  component: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: NotFound,
});

function RootDocument() {
  return (
    <React.Suspense fallback={null}>
      <TanstackQueryProvider>
        <TooltipProvider>
          <HeadContent />
          <Outlet />
          <TopLoadingBar />
        </TooltipProvider>
        {env.nodeEnv === 'development' && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Toaster position='top-right' />
      </TanstackQueryProvider>
    </React.Suspense>
  );
}
