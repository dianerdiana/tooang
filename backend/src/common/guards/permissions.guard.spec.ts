import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { jest } from '@jest/globals';

import {
  type AuthenticatedUser,
  PERMISSION,
  type Permission,
  PlatformRole,
  type PlatformRoleType,
} from '../auth';

import { PermissionsGuard } from './permissions.guard';

function contextFor(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => contextFor,
    getClass: () => PermissionsGuard,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardFor(required?: Permission[]) {
  const reflector = {
    getAllAndOverride: jest.fn(() => required),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

const actor = (platformRole: PlatformRoleType): AuthenticatedUser => ({
  id: 'actor-id',
  userId: 'usr_actor',
  platformRole,
});

describe('PermissionsGuard', () => {
  it('allows routes without permission metadata', () => {
    expect(guardFor().canActivate(contextFor())).toBe(true);
  });

  it('requires every declared platform permission', () => {
    const guard = guardFor([PERMISSION.USER_READ, PERMISSION.USER_DEACTIVATE]);

    expect(guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toBe(true);
    expect(() => guard.canActivate(contextFor(actor(PlatformRole.USER)))).toThrow(
      ForbiddenException,
    );
  });

  it('does not treat public or membership context as a USER platform grant', () => {
    const guard = guardFor([PERMISSION.PLACE_READ]);

    expect(() => guard.canActivate(contextFor(actor(PlatformRole.USER)))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toBe(true);
  });

  it('denies a protected route when the principal is missing', () => {
    expect(() => guardFor([PERMISSION.PROFILE_READ]).canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });
});
