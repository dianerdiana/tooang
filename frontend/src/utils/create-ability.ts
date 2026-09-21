import { createMongoAbility } from '@casl/ability';

import type { AbilityRule, AppAbility } from '@/types/ability-rule.type';

export function createAbility(rules: AbilityRule[]): AppAbility {
  return createMongoAbility(rules, {
    detectSubjectType: (object) => object.type,
  }) as AppAbility;
}
