import { useContext } from 'react';

import { AbilityContext } from '../context/ability-context';

export const useAppAbility = () => {
  const ability = useContext(AbilityContext);
  return ability;
};
