import { useAbility } from '@casl/react';

import type { AppAbility } from '@/types/ability-rule.type';

export const useAppAbility = () => useAbility<AppAbility>();
