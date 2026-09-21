import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/utils/hooks/use-auth';

export const useLoginMutation = () => {
  const { login } = useAuth();
  return useMutation({ mutationFn: login });
};

export const useLogoutMutation = () => {
  const { logout } = useAuth();
  return useMutation({ mutationFn: logout });
};
