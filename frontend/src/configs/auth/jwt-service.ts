import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import type { RefreshResponse } from '@/features/auth/auth.response';

import type { ApiResponse } from '@/types/api-response.type';

import { env } from '../env';

import jwtDefaultConfig from './jwt-default-config';

type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

export type JwtServiceConfig = {
  baseURL?: string;
  tokenType?: string;
  storageTokenKeyName?: string;
};

export class JwtService {
  readonly axin: AxiosInstance;

  private readonly refreshClient: AxiosInstance;

  private readonly jwtConfig: typeof jwtDefaultConfig;

  private accessToken: string | null;

  private refreshPromise: Promise<string> | null = null;

  private sessionExpiredListeners = new Set<() => void>();

  constructor(overrides: JwtServiceConfig = {}) {
    this.jwtConfig = { ...jwtDefaultConfig, ...overrides };
    const baseURL = this.jwtConfig.baseURL || env.baseApiUrl;

    this.accessToken = this.readStoredToken();
    this.axin = axios.create({
      baseURL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    this.refreshClient = axios.create({
      baseURL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });

    this.axin.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `${this.jwtConfig.tokenType} ${this.accessToken}`;
      }
      return config;
    });

    this.axin.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        if (!originalRequest || error.response?.status !== 401 || this.isRefreshExcluded(originalRequest.url)) {
          return Promise.reject(error);
        }

        if (originalRequest._retry) {
          this.expireSession();
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          await this.refreshAccessToken();
          return this.axin(originalRequest);
        } catch (refreshError) {
          this.expireSession();
          return Promise.reject(refreshError);
        }
      },
    );
  }

  get<TResponse>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<TResponse>> {
    return this.axin.get(url, config);
  }

  post<TRequest, TResponse>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.post(url, data, config);
  }

  put<TRequest, TResponse>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.put(url, data, config);
  }

  patch<TRequest, TResponse>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.patch(url, data, config);
  }

  delete<TResponse>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<TResponse>> {
    return this.axin.delete(url, config);
  }

  getToken() {
    return this.accessToken;
  }

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.jwtConfig.storageTokenKeyName, JSON.stringify(token));
    }
  }

  removeToken() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.jwtConfig.storageTokenKeyName);
    }
  }

  getStorageTokenKeyName() {
    return this.jwtConfig.storageTokenKeyName;
  }

  onSessionExpired(listener: () => void) {
    this.sessionExpiredListeners.add(listener);
    return () => this.sessionExpiredListeners.delete(listener);
  }

  refreshAccessToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshClient
        .post<ApiResponse<RefreshResponse>>(this.jwtConfig.refreshTokenUrl)
        .then(({ data }) => {
          if (data.error) throw data;
          this.setToken(data.data.accessToken);
          return data.data.accessToken;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  async logout() {
    try {
      await this.refreshClient.post(this.jwtConfig.logoutUrl);
    } finally {
      this.removeToken();
    }
  }

  private readStoredToken() {
    if (typeof window === 'undefined') return null;

    const storedToken = window.localStorage.getItem(this.jwtConfig.storageTokenKeyName);
    if (!storedToken) return null;

    try {
      return JSON.parse(storedToken) as string;
    } catch {
      window.localStorage.removeItem(this.jwtConfig.storageTokenKeyName);
      return null;
    }
  }

  private isRefreshExcluded(url: string | undefined) {
    if (!url) return false;
    return [this.jwtConfig.loginUrl, this.jwtConfig.registerUrl, this.jwtConfig.refreshTokenUrl].some((endpoint) =>
      url.includes(endpoint),
    );
  }

  private expireSession() {
    this.removeToken();
    this.sessionExpiredListeners.forEach((listener) => listener());
  }
}

export const createJwt = (jwtConfig: JwtServiceConfig) => new JwtService(jwtConfig);
