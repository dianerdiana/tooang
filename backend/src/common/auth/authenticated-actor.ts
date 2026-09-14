import type { Request } from 'express';

import type { PlatformRoleType } from './user-role.type';

export interface AuthenticatedActor {
  /** Internal database identifier. Never expose this value in API responses. */
  readonly id: string;
  readonly userId: string;
  /** Current server-side role resolved for this request. */
  readonly platformRole: PlatformRoleType;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedActor;
}

export type AuthenticationRequest = Request & {
  user?: AuthenticatedActor;
};

/** @deprecated Prefer AuthenticatedActor for new code. */
export type AuthenticatedUser = AuthenticatedActor;
