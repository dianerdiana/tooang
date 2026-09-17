import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { AbilityProvider } from '@casl/react';
import { RouterProvider } from '@tanstack/react-router';

import { FallbackSpinner } from '@/components/ui/fallback-spinner';

import { ability } from './configs/acl/initial-ability';
import { queryClient } from './integrations/tanstack-query/root-provider';
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
      <AbilityProvider value={ability}>
        <ThemeProvider defaultTheme='light' storageKey='tooang.theme'>
          <AuthContextProvider>
            <AppRouter />
          </AuthContextProvider>
        </ThemeProvider>
      </AbilityProvider>
    </StrictMode>,
  );
}
