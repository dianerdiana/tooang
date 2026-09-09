export const APP_CONFIG = {
  nodeEnv: 'app.nodeEnv',
  port: 'app.port',
  xApiKey: 'app.xApiKey',

  dbConnectionString: 'database.connectionString',

  jwtAccessToken: 'jwt.accessToken',
  jwtRefreshToken: 'jwt.refreshToken',
  jwtAccessTokenExpire: 'jwt.accessTokenExpire',
  jwtRefreshTokenExpire: 'jwt.refreshTokenExpire',

  cacheRedisUrl: 'cache.redisUrl',
  cacheTtl: 'cache.ttl',
} as const;
