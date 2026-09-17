import { createMongoAbility } from '@casl/ability';

import type { AbilityRule, AppAbility } from '@/types/ability-rule.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

export function createAbility(rules: AbilityRule[]): AppAbility {
  return createMongoAbility(rules, {
    detectSubjectType: (object) => object.type,
  }) as AppAbility;
}

export function createAbilityForUser(user: AuthenticatedUser | null): AppAbility {
  if (!user) return createAbility([]);

  const platformRules: AbilityRule[] = user.permissions.map((permission) => ({
    action: permission,
    subject: 'Platform',
  }));
  const placeRules: AbilityRule[] = user.placeMemberships.flatMap((membership) =>
    membership.effectivePermissions.map((permission) => ({
      action: permission,
      subject: 'Place',
      conditions: { placeId: membership.placeId },
    })),
  );

  return createMongoAbility([...platformRules, ...placeRules] as AbilityRule[], {
    detectSubjectType: (object) => object.type,
  }) as AppAbility;
}
