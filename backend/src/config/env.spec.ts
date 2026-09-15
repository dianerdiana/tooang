import env from './env';

describe('environment authentication configuration', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...original,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_ACCESS_TOKEN: 'a'.repeat(32),
      JWT_REFRESH_TOKEN: 'b'.repeat(32),
      RATE_LIMIT_SOURCE_HMAC_SECRET: 'c'.repeat(32),
      JWT_ACCESS_TOKEN_EXPIRE: '15m',
      JWT_REFRESH_TOKEN_EXPIRE: '30d',
      JWT_REMEMBER_ME_REFRESH_TOKEN_EXPIRE: '90d',
      BCRYPT_ROUNDS: '4',
      PUBLIC_API_ORIGIN: 'http://localhost:3000',
      CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
      IMAGEKIT_ENABLED: 'false',
    };
    delete process.env.TRUST_PROXY;
  });

  afterAll(() => {
    process.env = original;
  });

  it('accepts the exact SRS lifetimes and loopback development cookie transport', () => {
    const config = env();
    expect(config.jwt).toEqual(
      expect.objectContaining({
        accessTokenExpire: '15m',
        refreshTokenExpire: '30d',
        rememberMeRefreshTokenExpire: '90d',
      }),
    );
    expect(config.security.refreshCookieSecure).toBe(false);
  });

  it('rejects noncompliant lifetimes and weak or shared secrets', () => {
    process.env.JWT_ACCESS_TOKEN_EXPIRE = '16m';
    expect(env).toThrow('exactly 15m');

    process.env.JWT_ACCESS_TOKEN_EXPIRE = '15m';
    process.env.JWT_REFRESH_TOKEN = process.env.JWT_ACCESS_TOKEN;
    expect(env).toThrow('must be distinct');
  });

  it('requires HTTPS, explicit CORS, and explicit proxy trust in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.BCRYPT_ROUNDS = '12';
    process.env.PUBLIC_API_ORIGIN = 'https://api.example.com';
    delete process.env.CORS_ALLOWED_ORIGINS;
    expect(env).toThrow('CORS_ALLOWED_ORIGINS');

    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';
    expect(env).toThrow('TRUST_PROXY');

    process.env.TRUST_PROXY = '1';
    process.env.IMAGEKIT_ENABLED = 'true';
    process.env.IMAGEKIT_PUBLIC_KEY = 'public_test';
    process.env.IMAGEKIT_PRIVATE_KEY = 'private_test';
    process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
    expect(env().security.refreshCookieSecure).toBe(true);
  });

  it('allows disabled media locally and requires complete HTTPS ImageKit configuration', () => {
    expect(env().imageKit.enabled).toBe(false);
    process.env.IMAGEKIT_ENABLED = 'true';
    expect(env).toThrow('requires public key');
    process.env.IMAGEKIT_PUBLIC_KEY = 'public_test';
    process.env.IMAGEKIT_PRIVATE_KEY = 'private_test';
    process.env.IMAGEKIT_URL_ENDPOINT = 'http://example.com';
    expect(env).toThrow('must use HTTPS');
  });

  it('rejects invalid ports, database protocols, and origins with paths or credentials', () => {
    process.env.PORT = '65536';
    expect(env).toThrow('PORT');
    process.env.PORT = '3000';
    process.env.DATABASE_URL = 'mysql://localhost/db';
    expect(env).toThrow('PostgreSQL');
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.PUBLIC_API_ORIGIN = 'http://user:pass@localhost:3000/path';
    expect(env).toThrow('without credentials');
  });

  it('rejects port zero and placeholder secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '0';
    expect(env).toThrow('PORT');
    process.env.PORT = '3000';
    process.env.JWT_ACCESS_TOKEN = `change-me-${'a'.repeat(32)}`;
    expect(env).toThrow('placeholder');
  });
});
