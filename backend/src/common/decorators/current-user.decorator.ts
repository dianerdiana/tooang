import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { UserTokenPayload } from '../auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserTokenPayload | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: UserTokenPayload }>();
    return request.user;
  },
);
