import { createContext } from 'react';

import { Can as CaslCan, type CanProps } from '@casl/react';

import { ability } from '@/configs/acl/initial-ability';

import type { AppAbility } from '@/types/ability-rule.type';

export const AbilityContext = createContext<AppAbility>(ability);
export const Can = (props: CanProps<AppAbility>) => <CaslCan {...props} />;
