import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { jest } from '@jest/globals';

import { UserJwtService } from './jwt-config.service';

function setup(payload: Record<string, unknown>) {
  const verifyAsync = jest.fn(() => Promise.resolve(payload));
  const signAsync = jest.fn(() => Promise.resolve('signed-token'));
  const jwt = {
    verifyAsync,
    signAsync,
  } as unknown as JwtService;
  const config = new ConfigService({
    jwt: {
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      accessTokenExpire: '15m',
      refreshTokenExpire: '30d',
      rememberMeRefreshTokenExpire: '90d',
    },
  });
  return { service: new UserJwtService(jwt, config), verifyAsync, signAsync };
}

function realService() {
  const jwt = new JwtService();
  const config = new ConfigService({
    jwt: {
      accessToken: 'access-secret-with-sufficient-test-entropy',
      refreshToken: 'refresh-secret-with-sufficient-test-entropy',
      accessTokenExpire: '15m',
      refreshTokenExpire: '30d',
      rememberMeRefreshTokenExpire: '90d',
    },
  });
  return { service: new UserJwtService(jwt, config), jwt };
}

describe('UserJwtService access tokens', () => {
  it('returns only the validated identity even when extra authorization claims exist', async () => {
    const { service, verifyAsync } = setup({
      sub: 'usr_123',
      tokenType: 'access',
      platformRole: 'SUPER_ADMIN',
      permissions: ['user.deactivate'],
    });

    await expect(service.verifyAccessToken('token')).resolves.toEqual({ userId: 'usr_123' });
    expect(verifyAsync).toHaveBeenCalledWith('token', {
      secret: 'access-secret',
      algorithms: ['HS256'],
    });
  });

  it.each([
    ['missing subject', { tokenType: 'access' }],
    ['blank subject', { sub: '', tokenType: 'access' }],
    ['malformed subject', { sub: 'not-a-user-id', tokenType: 'access' }],
    ['non-string subject', { sub: 123, tokenType: 'access' }],
    ['refresh token type', { sub: 'usr_123', tokenType: 'refresh' }],
  ])('rejects a payload with %s', async (_label, payload) => {
    const { service } = setup(payload);
    await expect(service.verifyAccessToken('token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('normalizes verification failures to unauthorized', async () => {
    const { service, verifyAsync } = setup({});
    verifyAsync.mockRejectedValueOnce(new Error('expired or invalid signature'));

    await expect(service.verifyAccessToken('token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['malformed-token', '', 'header.payload.signature'])(
    'rejects malformed token %j',
    async (token) => {
      const { service } = realService();
      await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejects invalid signatures and expired access tokens', async () => {
    const { service, jwt } = realService();
    const wrongSignature = await jwt.signAsync(
      { sub: 'usr_123', tokenType: 'access' },
      { secret: 'different-secret', algorithm: 'HS256', expiresIn: '15m' },
    );
    const expired = await jwt.signAsync(
      { sub: 'usr_123', tokenType: 'access' },
      {
        secret: 'access-secret-with-sufficient-test-entropy',
        algorithm: 'HS256',
        expiresIn: -1,
      },
    );

    await expect(service.verifyAccessToken(wrongSignature)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.verifyAccessToken(expired)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a refresh-shaped token even when signed with the access secret', async () => {
    const { service, jwt } = realService();
    const token = await jwt.signAsync(
      { sub: 'usr_123', tokenType: 'refresh', sessionId: 'session', familyId: 'family' },
      {
        secret: 'access-secret-with-sufficient-test-entropy',
        algorithm: 'HS256',
        expiresIn: '15m',
      },
    );

    await expect(service.verifyAccessToken(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues identity-only HS256 access tokens', async () => {
    const { service, signAsync } = setup({});

    await expect(service.createAccessToken('usr_123')).resolves.toEqual({
      token: 'signed-token',
      expiresIn: 900,
    });
    expect(signAsync).toHaveBeenCalledWith(
      { sub: 'usr_123', tokenType: 'access' },
      { secret: 'access-secret', expiresIn: '15m', algorithm: 'HS256' },
    );
  });
});
