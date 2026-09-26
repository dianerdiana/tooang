import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { usersService } from '../services/users.service';
import type { CreateUserInput, PlatformRoleUpdateInput, UpdateProfileInput } from '../types/users.type';

import { usersKeys } from './users.key';

export const invalidateUsers = (queryClient: QueryClient) => queryClient.invalidateQueries({ queryKey: usersKeys.all });

export const refreshPlatformRoleData = async (queryClient: QueryClient, userId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: usersKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) }),
    queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY }),
  ]);
};

export const useDeactivateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersService.deactivate(userId),
    onSuccess: () => invalidateUsers(queryClient),
  });
};

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.create(input),
    onSuccess: () => invalidateUsers(queryClient),
  });
};

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => usersService.updateMe(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, (current: object | undefined) =>
        current ? { ...current, ...updated } : current,
      );
    },
  });
};

export const useUpdatePlatformRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: PlatformRoleUpdateInput }) =>
      usersService.updatePlatformRole(userId, input),
    onSuccess: async (user) => {
      queryClient.setQueryData(usersKeys.detail(user.userId), user);
      await refreshPlatformRoleData(queryClient, user.userId);
    },
  });
};
