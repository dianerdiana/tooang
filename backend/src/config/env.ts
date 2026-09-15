const durationSeconds = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return Number(match[1]) * multiplier;
};

const requiredSecret = (source: Record<string, unknown>, name: string): string => {
  const value = source[name];
  if (typeof value !== 'string') throw new Error(`${name} is required`);
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must contain at least 32 UTF-8 bytes`);
  }
  return value;
};

const loopbackHostname = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

const explicitOrigin = (name: string, value: string): URL => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) origin`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials, path, query, or hash`);
  }
  return url;
};

const placeholderSecret = (value: string): boolean =>
  /^(change[-_ ]?me|replace[-_ ]?me|example|password|secret|test)/iu.test(value);

export default () => {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`${issue.path.join('.') || 'environment'} ${issue.message}`);
  }
  const source = parsed.data;
  const nodeEnv = source.NODE_ENV;
  if (nodeEnv === 'production' && source.PORT === 0) {
    throw new Error('PORT must be between 1 and 65535 in production');
  }
  const local = nodeEnv === 'development' || nodeEnv === 'test';
  const connectionString = source.DATABASE_URL;
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }
  const accessToken = requiredSecret(source, 'JWT_ACCESS_TOKEN');
  const refreshToken = requiredSecret(source, 'JWT_REFRESH_TOKEN');
  const rateLimitSourceSecret = requiredSecret(source, 'RATE_LIMIT_SOURCE_HMAC_SECRET');
  if (accessToken === refreshToken) {
    throw new Error('JWT access-token and refresh-token secrets must be distinct');
  }

  if (
    nodeEnv === 'production' &&
    [accessToken, refreshToken, rateLimitSourceSecret].some(placeholderSecret)
  ) {
    throw new Error('JWT and rate-limit secrets must not use placeholder values in production');
  }

  const accessTokenExpire = source.JWT_ACCESS_TOKEN_EXPIRE;
  const refreshTokenExpire = source.JWT_REFRESH_TOKEN_EXPIRE;
  const rememberMeRefreshTokenExpire = source.JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE;
  if (durationSeconds(accessTokenExpire) !== 900) {
    throw new Error('JWT_ACCESS_TOKEN_EXPIRE must be exactly 15m');
  }
  if (durationSeconds(refreshTokenExpire) !== 30 * 86400) {
    throw new Error('JWT_REFRESH_TOKEN_EXPIRE must be exactly 30d');
  }
  if (durationSeconds(rememberMeRefreshTokenExpire) !== 90 * 86400) {
    throw new Error('JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE must be exactly 90d');
  }

  const bcryptRounds = source.BCRYPT_ROUNDS;
  const minimumRounds = local ? 4 : 12;
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < minimumRounds || bcryptRounds > 31) {
    throw new Error(`BCRYPT_ROUNDS must be an integer between ${minimumRounds} and 31`);
  }

  const publicApiOrigin = explicitOrigin('PUBLIC_API_ORIGIN', source.PUBLIC_API_ORIGIN);
  if (nodeEnv === 'production' && publicApiOrigin.protocol !== 'https:') {
    throw new Error('PUBLIC_API_ORIGIN must use HTTPS in production');
  }
  if (publicApiOrigin.protocol === 'http:' && !loopbackHostname(publicApiOrigin.hostname)) {
    throw new Error('Plain HTTP is allowed only for a loopback development API origin');
  }

  if (nodeEnv === 'production' && !source.CORS_ALLOWED_ORIGINS) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production');
  }
  const corsOrigins = (source.CORS_ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!corsOrigins.length || corsOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must be a non-empty explicit origin allowlist');
  }
  for (const origin of corsOrigins) {
    const parsedOrigin = explicitOrigin('CORS_ALLOWED_ORIGINS', origin);
    if (nodeEnv === 'production' && parsedOrigin.protocol !== 'https:') {
      throw new Error('CORS_ALLOWED_ORIGINS must use HTTPS in production');
    }
  }

  const rawTrustProxy = source.TRUST_PROXY?.trim();
  if (nodeEnv === 'production' && !rawTrustProxy) {
    throw new Error('TRUST_PROXY is required in production');
  }
  const trustProxy = rawTrustProxy
    ? /^\d+$/.test(rawTrustProxy)
      ? Number(rawTrustProxy)
      : rawTrustProxy.split(',').map((value) => value.trim())
    : false;

  const imageKitEnabled = source.IMAGEKIT_ENABLED === 'true';
  if (nodeEnv === 'production' && !imageKitEnabled) {
    throw new Error('IMAGEKIT_ENABLED must be true in production');
  }
  const imageKitPublicKey = source.IMAGEKIT_PUBLIC_KEY?.trim();
  const imageKitPrivateKey = source.IMAGEKIT_PRIVATE_KEY?.trim();
  const imageKitUrlEndpoint = source.IMAGEKIT_URL_ENDPOINT?.trim();
  if (imageKitEnabled && (!imageKitPublicKey || !imageKitPrivateKey || !imageKitUrlEndpoint)) {
    throw new Error('Enabled ImageKit requires public key, private key, and URL endpoint');
  }
  if (imageKitUrlEndpoint && new URL(imageKitUrlEndpoint).protocol !== 'https:') {
    throw new Error('IMAGEKIT_URL_ENDPOINT must use HTTPS');
  }
  const imageKitUploadFolder = `/${(source.IMAGEKIT_UPLOAD_FOLDER ?? '/tooang')
    .trim()
    .replace(/^\/+|\/+$/g, '')}`;

  return {
    app: {
      nodeEnv,
      port: source.PORT,
      publicApiOrigin: publicApiOrigin.origin,
      corsOrigins,
      trustProxy,
    },
    logging: { filesystemEnabled: false },
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
    imageKit: {
      enabled: imageKitEnabled,
      publicKey: imageKitPublicKey,
      privateKey: imageKitPrivateKey,
      urlEndpoint: imageKitUrlEndpoint?.replace(/\/+$/, ''),
      uploadFolder: imageKitUploadFolder,
    },
  };
};
import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_ACCESS_TOKEN: z.string().min(1),
    JWT_REFRESH_TOKEN: z.string().min(1),
    RATE_LIMIT_SOURCE_HMAC_SECRET: z.string().min(1),
    JWT_ACCESS_TOKEN_EXPIRE: z.string().default('15m'),
    JWT_REFRESH_TOKEN_EXPIRE: z.string().default('30d'),
    JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE: z.string().default('90d'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(31).default(12),
    PUBLIC_API_ORIGIN: z.string().default('http://localhost:3000'),
    CORS_ALLOWED_ORIGINS: z.string().optional(),
    TRUST_PROXY: z.string().optional(),
    IMAGEKIT_ENABLED: z.enum(['true', 'false']).default('false'),
    IMAGEKIT_PUBLIC_KEY: z.string().optional(),
    IMAGEKIT_PRIVATE_KEY: z.string().optional(),
    IMAGEKIT_URL_ENDPOINT: z.string().optional(),
    IMAGEKIT_UPLOAD_FOLDER: z.string().optional(),
  })
  .passthrough();
