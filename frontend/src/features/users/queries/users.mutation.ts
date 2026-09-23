import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { usersService } from '../services/users.service';

import { usersKeys } from './users.key';

export const invalidateUsers = (queryClient: QueryClient) => queryClient.invalidateQueries({ queryKey: usersKeys.all });

export const useDeactivateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersService.deactivate(userId),
    onSuccess: () => invalidateUsers(queryClient),
  });
};
