import { createContext, useCallback, useEffect, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/configs/api-config';

import { authSessionQueryOptions, clearAuthSession, setAuthSession } from '@/features/auth/queries/auth-session.query';
import type { LoginDto, RegisterDto } from '@/features/auth/schemas/auth.schema';
import { authService } from '@/features/auth/services/auth.service';
import type { RegisterResponse } from '@/features/auth/types/auth.response';

import type { AuthenticatedUser } from '@/types/user-data.type';

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
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(authSessionQueryOptions());
  const user = sessionQuery.data ?? null;
  const isInitialLoading = sessionQuery.isPending;

  const clearLocalSession = useCallback(() => {
    api.removeToken();
    clearAuthSession(queryClient);
  }, [queryClient]);

  const login = useCallback(
    async (credentials: LoginDto) => {
      const authenticatedUser = await authService.login(credentials);
      setAuthSession(queryClient, authenticatedUser);
      return authenticatedUser;
    },
    [queryClient],
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
    if (sessionQuery.isError) clearLocalSession();
  }, [clearLocalSession, sessionQuery.isError]);

  useEffect(() => {
    const unsubscribe = api.onSessionExpired(clearLocalSession);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === api.getStorageTokenKeyName() && event.newValue === null) {
        clearLocalSession();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearLocalSession]);

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
