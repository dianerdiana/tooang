import type { UserRole } from './enums/user-role.enum';
import type { AbilityRule } from './ability-rule.type';

export type UserData = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  permissions: AbilityRule[];
};
