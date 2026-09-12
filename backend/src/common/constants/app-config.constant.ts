export const APP_CONFIG = {
  nodeEnv: 'app.nodeEnv',
  port: 'app.port',

  dbConnectionString: 'database.connectionString',

  jwtAccessToken: 'jwt.accessToken',
  jwtRefreshToken: 'jwt.refreshToken',
  jwtAccessTokenExpire: 'jwt.accessTokenExpire',
  jwtRefreshTokenExpire: 'jwt.refreshTokenExpire',
  jwtRememberMeRefreshTokenExpire: 'jwt.rememberMeRefreshTokenExpire',

  bcryptRounds: 'security.bcryptRounds',

  cacheRedisUrl: 'cache.redisUrl',
  cacheTtl: 'cache.ttl',
} as const;
