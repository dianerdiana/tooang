import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { RouterProvider } from '@tanstack/react-router';

import { FallbackSpinner } from '@/components/ui/fallback-spinner';

import TanstackQueryProvider, { queryClient } from './integrations/tanstack-query/root-provider';
import { AppAbilityProvider } from './utils/context/ability-context';
import { AuthContextProvider } from './utils/context/auth-context';
import { ThemeProvider } from './utils/context/theme-context';
import { useAppAbility } from './utils/hooks/use-app-ability';
import { useAuth } from './utils/hooks/use-auth';
import { router } from './router';

function AppRouter() {
  const ability = useAppAbility();
  const { isAuthenticated, isInitialLoading, user } = useAuth();

  useEffect(() => {
    void router.invalidate();
  }, [isAuthenticated, isInitialLoading, user]);

  if (isInitialLoading) {
    return <FallbackSpinner fullscreen />;
  }

  return (
    <RouterProvider
      router={router}
      context={{
        queryClient,
        auth: {
          isAuthenticated,
          isInitialLoading,
          user,
        },
        ability,
      }}
    />
  );
}

// Render the app
const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme='light' storageKey='tooang.theme'>
        <TanstackQueryProvider>
          <AuthContextProvider>
            <AppAbilityProvider>
              <AppRouter />
            </AppAbilityProvider>
          </AuthContextProvider>
        </TanstackQueryProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
