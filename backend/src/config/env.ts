export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
  database: { connectionString: process.env.DATABASE_URL ?? 'replace-me' },
  jwt: {
    accessToken: process.env.JWT_ACCESS_TOKEN,
    refreshToken: process.env.JWT_REFRESH_TOKEN,
    accessTokenExpire: process.env.JWT_ACCESS_TOKEN_EXPIRE,
    refreshTokenExpire: process.env.JWT_REFRESH_TOKEN_EXPIRE,
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
});
