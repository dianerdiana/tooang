export const APP_CONFIG = {
  nodeEnv: 'app.nodeEnv',
  port: 'app.port',
  publicApiOrigin: 'app.publicApiOrigin',
  corsOrigins: 'app.corsOrigins',
  trustProxy: 'app.trustProxy',

  dbConnectionString: 'database.connectionString',

  jwtAccessToken: 'jwt.accessToken',
  jwtRefreshToken: 'jwt.refreshToken',
  jwtAccessTokenExpire: 'jwt.accessTokenExpire',
  jwtRefreshTokenExpire: 'jwt.refreshTokenExpire',
  jwtRememberMeRefreshTokenExpire: 'jwt.rememberMeRefreshTokenExpire',

  bcryptRounds: 'security.bcryptRounds',
  passwordDenylistPath: 'security.passwordDenylistPath',
  rateLimitSourceSecret: 'security.rateLimitSourceSecret',
  refreshCookieSecure: 'security.refreshCookieSecure',

  cacheRedisUrl: 'cache.redisUrl',
  cacheTtl: 'cache.ttl',
} as const;
