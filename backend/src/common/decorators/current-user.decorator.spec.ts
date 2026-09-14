import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedActor, PlatformRole } from '../auth';

import { currentActorFrom } from './current-user.decorator';

function contextFor(user?: AuthenticatedActor): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('current actor decorator', () => {
  const actor: AuthenticatedActor = {
    id: 'internal-id',
    userId: 'usr_actor',
    platformRole: PlatformRole.USER,
  };

  it('returns the server-attached actor', () => {
    expect(currentActorFrom(contextFor(actor))).toBe(actor);
  });

  it('rejects a missing actor', () => {
    expect(() => currentActorFrom(contextFor())).toThrow(UnauthorizedException);
  });
});
