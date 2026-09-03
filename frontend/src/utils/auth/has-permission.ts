import type { MongoAbility } from '@casl/ability';
import { redirect } from '@tanstack/react-router';

import type { PermissionAction, PermissionSubject } from '@/types/ability-rule.type';

import type { RouterContext } from '@/router';

export const hasPermission = (ability: MongoAbility, action: PermissionAction, subject: PermissionSubject) => {
  return ability.can(action, subject);
};

export const hasPermissionPage = (context: RouterContext, action: PermissionAction, subject: PermissionSubject) => {
  if (!hasPermission(context.ability, action, subject) && !context.auth.isInitialLoading) {
    throw redirect({ to: '/not-found' });
  }
};
