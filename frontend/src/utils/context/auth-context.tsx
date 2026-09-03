import { createContext, useContext, useEffect, useState } from 'react';

import type { AxiosResponse } from 'axios';

import { api } from '@/configs/api-config';

import type { LoginResponse } from '@/features/auth/auth.response';
import type { LoginDto } from '@/features/auth/auth.schema';

import { createAbility } from '../create-ability';

import type { AbilityRule } from '@/types/ability-rule.type';
import type { ApiResponse } from '@/types/api-response.type';
import { UserRole } from '@/types/enums/user-role.enum';
import type { UserData } from '@/types/user-data.type';

import { toApiError } from '../api-error.util';

import { AbilityContext } from './ability-context';

const EMPTY_PERMISSIONS: AbilityRule[] = [];

export type AuthContextType = {
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  login: (credentials: any) => Promise<ApiResponse<LoginResponse>>;
  register: (credentials: any) => Promise<ApiResponse<LoginResponse>>;
  logout: () => Promise<void>;
  userData: UserData;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const ability = useContext(AbilityContext);

  const updateAbility = (permissions: AbilityRule[]) => {
    const newAbility = createAbility(permissions);
    ability.update(newAbility.rules);
  };

  const clearAuthState = () => {
    api.logout();
    setUserData(null);
    updateAbility(EMPTY_PERMISSIONS);
    setIsInitialLoading(false);
  };

  const login = async (credentials: any): Promise<ApiResponse<LoginResponse>> => {
    try {
      const response = await api.post<LoginDto, ApiResponse<LoginResponse>>('/auth/login', credentials);

      if (response.data.status === 'success') {
        const { data } = response.data;
        updateAbility(data.user.permissions);
        api.setToken(data.token);
        setUserData(data.user);
        setIsInitialLoading(false);
      }

      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  };

  const register = async (credentials: any): Promise<AxiosResponse<ApiResponse<LoginResponse>> | any> => {
    try {
      const response = await api.register(credentials);

      setIsInitialLoading(false);

      return response.data;
    } catch (error) {
      throw toApiError(error);
    }
  };

  const logout = async () => {
    clearAuthState();
  };

  useEffect(() => {
    const token = api.getToken();

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInitialLoading(false);
      return;
    }

    const bootstrap = async () => {
      try {
        const response = await api.get<ApiResponse<UserData>>('/auth/me');

        if (response.data.status === 'success') {
          setUserData(response.data.data);
          updateAbility(response.data.data.permissions);
        }
      } catch {
        clearAuthState();
      } finally {
        setIsInitialLoading(false);
      }
    };

    void bootstrap();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === api.getStorageTokenKeyName() && event.newValue === null) {
        clearAuthState();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!userData,
        isInitialLoading,
        login,
        register,
        logout,
        userData: userData
          ? userData
          : ({
              id: '',
              role: UserRole.USER,
              name: '',
              email: '',
              permissions: EMPTY_PERMISSIONS,
            } as UserData),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthContextProvider };
