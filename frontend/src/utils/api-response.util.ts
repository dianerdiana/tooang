import type { ApiResponse, PaginatedResult } from '@/types/api-response.type';

export const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.error) {
    return response.data;
  }

  throw response;
};

export const unwrapPaginatedApiResponse = <T>(response: ApiResponse<T>): PaginatedResult<T> => {
  if (!response.error) {
    return {
      items: response.data,
      meta: response.meta ?? {},
    };
  }

  throw response;
};
