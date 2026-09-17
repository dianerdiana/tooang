import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/configs/api-config';

import { queryClient } from '@/integrations/tanstack-query/root-provider';

import type { RegisterResponse } from '@/features/auth/auth.response';
import type { LoginDto, RegisterDto } from '@/features/auth/auth.schema';
import { authService } from '@/features/auth/auth.service';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { createAbilityForUser } from '../create-ability';

import { AbilityContext } from './ability-context';

export type AuthContextType = {
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  login: (credentials: LoginDto) => Promise<AuthenticatedUser>;
  register: (credentials: RegisterDto) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  user: AuthenticatedUser | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const ability = useContext(AbilityContext);

  const applyUser = useCallback(
    (nextUser: AuthenticatedUser | null) => {
      setUser(nextUser);
      ability.update(createAbilityForUser(nextUser).rules);
    },
    [ability],
  );

  const clearLocalSession = useCallback(() => {
    api.removeToken();
    applyUser(null);
    queryClient.clear();
  }, [applyUser]);

  const login = useCallback(
    async (credentials: LoginDto) => {
      const authenticatedUser = await authService.login(credentials);
      applyUser(authenticatedUser);
      return authenticatedUser;
    },
    [applyUser],
  );

  const register = useCallback((credentials: RegisterDto) => authService.register(credentials), []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  useEffect(() => {
    let active = true;
    const unsubscribe = api.onSessionExpired(() => {
      if (active) clearLocalSession();
    });

    const bootstrap = async () => {
      try {
        const authenticatedUser = await authService.restoreSession();
        if (active) applyUser(authenticatedUser);
      } catch {
        if (active) clearLocalSession();
      } finally {
        if (active) setIsInitialLoading(false);
      }
    };

    void bootstrap();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === api.getStorageTokenKeyName() && event.newValue === null) {
        clearLocalSession();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyUser, clearLocalSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: user !== null,
      isInitialLoading,
      login,
      register,
      logout,
      user,
    }),
    [isInitialLoading, login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthContextProvider };
