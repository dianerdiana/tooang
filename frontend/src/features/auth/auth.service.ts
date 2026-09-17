import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import type { LoginResponse, ProfileResponse, RegisterResponse } from './auth.response';
import type { LoginDto, RegisterDto } from './auth.schema';

export const authService = {
  async login(credentials: LoginDto): Promise<AuthenticatedUser> {
    try {
      const response = await api.post<LoginDto, ApiResponse<LoginResponse>>('/auth/login', credentials);
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
      const response = await api.post<RegisterDto, ApiResponse<RegisterResponse>>('/auth/register', credentials);
      return unwrapApiResponse(response.data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getProfile() {
    try {
      const response = await api.get<ApiResponse<ProfileResponse>>('/me');
      return unwrapApiResponse(response.data).user;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async restoreSession() {
    if (!api.getToken()) {
      await api.refreshAccessToken();
    }
    return this.getProfile();
  },

  logout() {
    return api.logout();
  },
};
