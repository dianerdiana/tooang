import { normalizeUserListParams } from '../schemas/users.schema';
import type { UserListParams } from '../types/users.type';

export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...usersKeys.lists(), normalizeUserListParams(params)] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (userId: string) => [...usersKeys.details(), userId] as const,
};
