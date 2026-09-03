import { createMongoAbility, type MongoQuery } from '@casl/ability';

import type { AbilityRule, AppAbility, PermissionAction, PermissionSubject } from '@/types/ability-rule.type';

export function createAbility(rules: AbilityRule[]): AppAbility {
  return createMongoAbility<[PermissionAction, PermissionSubject], MongoQuery>(rules, {
    detectSubjectType: (object: any) => object.type,
  });
}
