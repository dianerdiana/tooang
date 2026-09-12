export default () => {
  const accessToken = process.env.JWT_ACCESS_TOKEN;
  const refreshToken = process.env.JWT_REFRESH_TOKEN;
  if (!accessToken || !refreshToken) {
    throw new Error('JWT_ACCESS_TOKEN and JWT_REFRESH_TOKEN are required');
  }
  if (accessToken === refreshToken) {
    throw new Error('JWT access-token and refresh-token secrets must be distinct');
  }

  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: Number(process.env.PORT ?? 3000),
    },
    database: { connectionString: process.env.DATABASE_URL ?? 'replace-me' },
    jwt: {
      accessToken,
      refreshToken,
      accessTokenExpire: process.env.JWT_ACCESS_TOKEN_EXPIRE ?? '15m',
      refreshTokenExpire: process.env.JWT_REFRESH_TOKEN_EXPIRE ?? '30d',
      rememberMeRefreshTokenExpire: process.env.JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE ?? '90d',
    },
    security: { bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12) },
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
