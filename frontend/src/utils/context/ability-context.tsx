import { useMemo } from 'react';

import { AbilityProvider, Can as CaslCan, type CanProps } from '@casl/react';

import { createAbilityForUser } from '@/utils/create-ability';
import { useAuth } from '@/utils/hooks/use-auth';

import type { AppAbility } from '@/types/ability-rule.type';

export const Can = (props: CanProps<AppAbility>) => <CaslCan {...props} />;

export const AppAbilityProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const ability = useMemo(() => createAbilityForUser(user), [user]);

  return <AbilityProvider value={ability}>{children}</AbilityProvider>;
};
