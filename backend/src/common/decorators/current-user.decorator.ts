import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedActor, AuthenticationRequest } from '../auth';

export function currentActorFrom(context: ExecutionContext): AuthenticatedActor {
  const actor = context.switchToHttp().getRequest<AuthenticationRequest>().user;
  if (!actor) throw new UnauthorizedException();
  return actor;
}

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor => currentActorFrom(context),
);

/** @deprecated Prefer CurrentActor for new code. */
export const CurrentUser = CurrentActor;
