import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';

import { placeMembersService } from '../services/place-members.service';
import type { SetCashierInput } from '../types/place-members.type';

import { placeMembersKeys } from './place-members.query';

export const invalidateMembershipData = async (client: QueryClient, placeId: string) => {
  await Promise.all([
    client.invalidateQueries({ queryKey: placeMembersKeys.list(placeId) }),
    client.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY }),
  ]);
};

export const useSetCashierMutation = (placeId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: SetCashierInput }) =>
      placeMembersService.setCashier(placeId, userId, input),
    onSuccess: () => invalidateMembershipData(client, placeId),
  });
};

export const useRevokeCashierMutation = (placeId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => placeMembersService.revoke(placeId, userId),
    onSuccess: () => invalidateMembershipData(client, placeId),
  });
};
