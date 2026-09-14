import { SetMetadata } from '@nestjs/common';

export type AuthRateLimitPolicy = 'registration' | 'login' | 'refresh' | 'logout';

export const AUTH_RATE_LIMIT_KEY = 'tooang:auth-rate-limit';
export const AuthRateLimit = (policy: AuthRateLimitPolicy) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, policy);

export const AUTH_RATE_LIMIT_POLICIES: Record<
  AuthRateLimitPolicy,
  ReadonlyArray<{ name: string; limit: number; windowSeconds: number }>
> = {
  registration: [{ name: 'registration-1h', limit: 5, windowSeconds: 3600 }],
  login: [
    { name: 'login-15m', limit: 10, windowSeconds: 900 },
    { name: 'login-1h', limit: 30, windowSeconds: 3600 },
  ],
  refresh: [{ name: 'refresh-15m', limit: 30, windowSeconds: 900 }],
  logout: [{ name: 'logout-15m', limit: 60, windowSeconds: 900 }],
};
