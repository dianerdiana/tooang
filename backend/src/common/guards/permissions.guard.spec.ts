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
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../decorators';

import { PermissionsGuard } from './permissions.guard';

function contextFor(user?: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => contextFor,
    getClass: () => PermissionsGuard,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardFor({
  all,
  any,
}: {
  all?: Permission[];
  any?: Permission[];
} = {}) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === PERMISSIONS_KEY) return all;
      if (key === ANY_PERMISSIONS_KEY) return any;
      return undefined;
    }),
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

  it('requires every declared permission to be available to the actor', () => {
    const guard = guardFor({
      all: [PERMISSION.USER_READ, PERMISSION.USER_DEACTIVATE],
    });

    expect(guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toBe(true);
    expect(() => guard.canActivate(contextFor(actor(PlatformRole.USER)))).toThrow(
      ForbiddenException,
    );
  });

  it('admits membership-capable operations without treating admission as target access', () => {
    const guard = guardFor({ all: [PERMISSION.PLACE_UPDATE] });

    expect(guard.canActivate(contextFor(actor(PlatformRole.USER)))).toBe(true);
    expect(guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toBe(true);
  });

  it('supports any-of admission for routes that resolve the exact action in a service', () => {
    const guard = guardFor({
      any: [PERMISSION.CASHIER_ASSIGN, PERMISSION.OWNER_ASSIGN],
    });

    expect(guard.canActivate(contextFor(actor(PlatformRole.USER)))).toBe(true);
    expect(guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toBe(true);
    expect(guard.canActivate(contextFor(actor(PlatformRole.SUPER_ADMIN)))).toBe(true);
  });

  it('denies a global-only capability that the platform role does not grant', () => {
    const guard = guardFor({ all: [PERMISSION.OWNER_ASSIGN] });

    expect(() => guard.canActivate(contextFor(actor(PlatformRole.ADMIN)))).toThrow(
      ForbiddenException,
    );
  });

  it('denies a protected route when the principal is missing', () => {
    expect(() => guardFor({ all: [PERMISSION.PROFILE_READ] }).canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });
});
