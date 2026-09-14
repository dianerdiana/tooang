import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { jest } from '@jest/globals';

import { type AuthenticationRequest, PlatformRole } from '@/common/auth';

import { UserJwtService } from '../../lib';

import { AuthPrincipalService } from './auth-principal.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const actor = Object.freeze({
  id: 'internal-id',
  userId: 'usr_123',
  platformRole: PlatformRole.USER,
});

function contextFor(request: Partial<AuthenticationRequest>): ExecutionContext {
  return {
    getHandler: () => contextFor,
    getClass: () => JwtAuthGuard,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function setup(isPublic = false) {
  const verifyAccessToken = jest.fn(() => Promise.resolve({ userId: actor.userId }));
  const resolveActiveActor = jest.fn<() => Promise<typeof actor | null>>(() =>
    Promise.resolve(actor),
  );
  const reflector = {
    getAllAndOverride: jest.fn(() => isPublic),
  } as unknown as Reflector;
  const jwt = {
    verifyAccessToken,
  } as unknown as UserJwtService;
  const principals = {
    resolveActiveActor,
  } as unknown as AuthPrincipalService;
  return {
    guard: new JwtAuthGuard(reflector, jwt, principals),
    verifyAccessToken,
    resolveActiveActor,
  };
}

describe('JwtAuthGuard', () => {
  it('verifies identity and replaces request state with the database actor', async () => {
    const spoofed = { ...actor, platformRole: PlatformRole.SUPER_ADMIN };
    const request = {
      headers: { authorization: 'Bearer signed-token' },
      user: spoofed,
    } as unknown as AuthenticationRequest;
    const { guard, verifyAccessToken, resolveActiveActor } = setup();

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(verifyAccessToken).toHaveBeenCalledWith('signed-token');
    expect(resolveActiveActor).toHaveBeenCalledWith(actor.userId);
    expect(request.user).toBe(actor);
  });

  it.each([
    ['missing', undefined],
    ['array', ['Bearer token']],
    ['empty', 'Bearer '],
    ['extra whitespace', 'Bearer token another'],
    ['wrong scheme', 'Basic token'],
  ])('rejects a %s authorization header', async (_label, authorization) => {
    const { guard } = setup();
    const request = { headers: { authorization }, user: actor } as unknown as AuthenticationRequest;

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });

  it('rejects a valid token when current server-side state has no active actor', async () => {
    const { guard, resolveActiveActor } = setup();
    resolveActiveActor.mockResolvedValueOnce(null);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer token' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not authenticate explicit public routes', async () => {
    const { guard, verifyAccessToken, resolveActiveActor } = setup(true);

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(resolveActiveActor).not.toHaveBeenCalled();
  });
});
