import { createMongoAbility } from '@casl/ability';

import type { AbilityRule, AppAbility } from '@/types/ability-rule.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

export function createAbility(rules: AbilityRule[]): AppAbility {
  return createMongoAbility(rules, {
    detectSubjectType: (object) => object.type,
  }) as AppAbility;
}

export function createAbilityRules(user: AuthenticatedUser | null): AbilityRule[] {
  if (!user) return [];

  const rules: AbilityRule[] = [];
  const platformPermissions = new Set(user.permissions);

  for (const permission of platformPermissions) {
    rules.push({ action: permission, subject: 'Platform' });
  }

  const globalPermissions = new Set(user.globalPermissions);

  for (const permission of globalPermissions) {
    rules.push({ action: permission, subject: 'Place' });
  }

  const placeRules = new Set<string>();

  for (const membership of user.placeMemberships) {
    for (const permission of new Set(membership.effectivePermissions)) {
      if (globalPermissions.has(permission)) continue;

      const ruleKey = `${membership.placeId}\0${permission}`;
      if (placeRules.has(ruleKey)) continue;

      placeRules.add(ruleKey);
      rules.push({
        action: permission,
        subject: 'Place',
        conditions: { placeId: membership.placeId },
      });
    }
  }

  return rules;
}

export function createAbilityForUser(user: AuthenticatedUser | null): AppAbility {
  return createAbility(createAbilityRules(user));
}
