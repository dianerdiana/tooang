import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { normalizeUserListParams } from '../schemas/users.schema';
import { usersService } from '../services/users.service';
import type { UserListParams } from '../types/users.type';

import { usersKeys } from './users.key';

export const usersQueryOptions = (params: UserListParams) => {
  const normalized = normalizeUserListParams(params);
  return queryOptions({
    queryKey: usersKeys.list(normalized),
    queryFn: () => usersService.list(normalized),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};
