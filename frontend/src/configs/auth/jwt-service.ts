import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { env } from '../env';

import jwtDefaultConfig from './jwt-default-config';

export type JwtServiceConfig = {
  baseURL?: string;
  tokenType?: string;
  storageTokenKeyName?: string;
};

export class JwtService {
  axin: AxiosInstance;

  jwtConfig = { ...jwtDefaultConfig };

  accessToken: string | null = this.getToken();

  isAlreadyFetchingAccessToken = false;

  subscribers: ((accessToken: string) => void)[] = [];

  constructor({ ...overrideServiceConfig }: JwtServiceConfig) {
    this.jwtConfig = { ...this.jwtConfig, ...overrideServiceConfig };

    this.axin = axios.create({
      baseURL: this.jwtConfig.baseURL || env.baseApiUrl || '',
      // withCredentials: true, // WAJIB untuk HttpOnly Cookie
      headers: { 'Content-Type': 'application/json' },
    });

    this.axin.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `${this.jwtConfig.tokenType} ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.axin.interceptors.response.use(
      (response) => response,
      async (error) => {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const originalRequest = axiosError.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

        if (!originalRequest || status !== 401) {
          return Promise.reject(error);
        }

        const requestUrl = originalRequest.url ?? '';

        if (
          requestUrl.includes(this.jwtConfig.loginUrl) ||
          requestUrl.includes(this.jwtConfig.registerUrl) ||
          requestUrl.includes(this.jwtConfig.refreshTokenUrl)
        ) {
          return Promise.reject(error);
        }

        if (originalRequest._retry) {
          this.logout();
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          await this.refreshToken();
          return this.axin(originalRequest);
        } catch (refreshError) {
          this.logout();
          return Promise.reject(refreshError);
        }

        return Promise.reject(error);
      },
    );
  }

  get<TResponse = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<TResponse>> {
    return this.axin.get(url, config);
  }

  post<TRequest = any, TResponse = any>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.post(url, data, config);
  }

  put<TRequest = any, TResponse = any>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.put(url, data, config);
  }

  patch<TRequest = any, TResponse = any>(
    url: string,
    data?: TRequest,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<TResponse>> {
    return this.axin.patch(url, data, config);
  }

  delete<TResponse = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<TResponse>> {
    return this.axin.delete(url, config);
  }

  onAccessTokenFetched(accessToken: string) {
    this.subscribers.forEach((callback) => callback(accessToken));
    this.subscribers = [];
  }

  addSubscriber(callback: (token: string) => void) {
    this.subscribers.push(callback);
  }

  getToken(): string | null {
    const existingToken = localStorage.getItem(this.jwtConfig.storageTokenKeyName);

    return existingToken ? JSON.parse(existingToken) : null;
  }

  setToken(token: string) {
    this.accessToken = token;
    localStorage.setItem(this.jwtConfig.storageTokenKeyName, JSON.stringify(token));
  }

  removeToken() {
    this.accessToken = null;
    localStorage.removeItem(this.jwtConfig.storageTokenKeyName);
  }

  getStorageTokenKeyName() {
    return this.jwtConfig.storageTokenKeyName;
  }

  refreshToken(): Promise<AxiosResponse> {
    // Backend saat ini menggunakan /auth/me untuk revalidasi sesi token yang ada.
    return this.axin.get(this.jwtConfig.refreshTokenUrl);
  }

  login(credentials: any) {
    return this.axin.post(this.jwtConfig.loginUrl, credentials);
  }

  register(credentials: any) {
    return this.axin.post(this.jwtConfig.registerUrl, credentials);
  }

  logout() {
    this.removeToken();
  }
}

export const createJwt = (jwtConfig: JwtServiceConfig) => new JwtService(jwtConfig);
