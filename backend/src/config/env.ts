const durationSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return Number(match[1]) * multiplier;
};

const requiredSecret = (name: string): string => {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must contain at least 32 UTF-8 bytes`);
  }
  return value;
};

const loopbackHostname = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const local = nodeEnv === 'development' || nodeEnv === 'test';
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const accessToken = requiredSecret('JWT_ACCESS_TOKEN');
  const refreshToken = requiredSecret('JWT_REFRESH_TOKEN');
  const rateLimitSourceSecret = requiredSecret('RATE_LIMIT_SOURCE_HMAC_SECRET');
  if (accessToken === refreshToken) {
    throw new Error('JWT access-token and refresh-token secrets must be distinct');
  }

  const accessTokenExpire = process.env.JWT_ACCESS_TOKEN_EXPIRE ?? '15m';
  const refreshTokenExpire = process.env.JWT_REFRESH_TOKEN_EXPIRE ?? '30d';
  const rememberMeRefreshTokenExpire = process.env.JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE ?? '90d';
  if (durationSeconds(accessTokenExpire) !== 900) {
    throw new Error('JWT_ACCESS_TOKEN_EXPIRE must be exactly 15m');
  }
  if (durationSeconds(refreshTokenExpire) !== 30 * 86400) {
    throw new Error('JWT_REFRESH_TOKEN_EXPIRE must be exactly 30d');
  }
  if (durationSeconds(rememberMeRefreshTokenExpire) !== 90 * 86400) {
    throw new Error('JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE must be exactly 90d');
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const minimumRounds = local ? 4 : 12;
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < minimumRounds || bcryptRounds > 31) {
    throw new Error(`BCRYPT_ROUNDS must be an integer between ${minimumRounds} and 31`);
  }

  const publicApiOrigin = new URL(process.env.PUBLIC_API_ORIGIN ?? 'http://localhost:3000');
  if (nodeEnv === 'production' && publicApiOrigin.protocol !== 'https:') {
    throw new Error('PUBLIC_API_ORIGIN must use HTTPS in production');
  }
  if (publicApiOrigin.protocol === 'http:' && !loopbackHostname(publicApiOrigin.hostname)) {
    throw new Error('Plain HTTP is allowed only for a loopback development API origin');
  }

  if (nodeEnv === 'production' && !process.env.CORS_ALLOWED_ORIGINS) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production');
  }
  const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!corsOrigins.length || corsOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must be a non-empty explicit origin allowlist');
  }
  for (const origin of corsOrigins) new URL(origin);

  const rawTrustProxy = process.env.TRUST_PROXY?.trim();
  if (nodeEnv === 'production' && !rawTrustProxy) {
    throw new Error('TRUST_PROXY is required in production');
  }
  const trustProxy = rawTrustProxy
    ? /^\d+$/.test(rawTrustProxy)
      ? Number(rawTrustProxy)
      : rawTrustProxy.split(',').map((value) => value.trim())
    : false;

  return {
    app: {
      nodeEnv,
      port: Number(process.env.PORT ?? 3000),
      publicApiOrigin: publicApiOrigin.origin,
      corsOrigins,
      trustProxy,
    },
    database: { connectionString },
    jwt: {
      accessToken,
      refreshToken,
      accessTokenExpire,
      refreshTokenExpire,
      rememberMeRefreshTokenExpire,
    },
    security: {
      bcryptRounds,
      passwordDenylistPath: process.env.PASSWORD_DENYLIST_PATH,
      rateLimitSourceSecret,
      refreshCookieSecure: publicApiOrigin.protocol === 'https:',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      modelVersion: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
      fallbackModelVersion: process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite',
    },
    cache: {
      redisUrl: process.env.CACHE_REDIS_URL,
      ttl: Number(process.env.CACHE_TTL ?? 60),
    },
  };
};
