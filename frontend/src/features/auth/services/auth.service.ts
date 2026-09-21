import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiDataResponse } from '@/types/api-response.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import type { LoginDto, RegisterDto } from '../schemas/auth.schema';
import type { LoginResponse, MeResponse, RegisterResponse } from '../types/auth.response';
import { toAuthenticatedUser } from '../utils/auth.mapper';

export const authService = {
  async login(credentials: LoginDto): Promise<AuthenticatedUser> {
    try {
      const response = await api.post<LoginDto, ApiDataResponse<LoginResponse>>('/auth/login', credentials);
      const loginData = unwrapApiResponse(response.data);
      api.setToken(loginData.accessToken);
      return await this.getProfile();
    } catch (error) {
      api.removeToken();
      throw toApiError(error);
    }
  },

  async register(credentials: RegisterDto) {
    try {
      const response = await api.post<RegisterDto, ApiDataResponse<RegisterResponse>>('/auth/register', credentials);
      return unwrapApiResponse(response.data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getProfile() {
    try {
      const response = await api.get<ApiDataResponse<MeResponse>>('/me');
      return toAuthenticatedUser(unwrapApiResponse(response.data).user);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async restoreSession() {
    try {
      if (!api.getToken()) {
        await api.refreshAccessToken();
      }
      return await this.getProfile();
    } catch (error) {
      throw toApiError(error);
    }
  },

  async logout() {
    try {
      await api.logout();
    } catch (error) {
      throw toApiError(error);
    }
  },
};
