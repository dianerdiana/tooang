import type { ApiPaginatedResponse, ApiResponse, ApplicationError, PaginatedResult } from '@/types/api-response.type';

import { toApiError } from './api-error.util';

const invalidApiResponse = (message: string): ApplicationError => ({
  error: true,
  message,
  code: 'INVALID_API_RESPONSE',
  isNetworkError: false,
});

export const unwrapApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.error) {
    throw toApiError(response);
  }

  if (response.data === undefined) {
    throw invalidApiResponse('API success response did not include data');
  }

  return response.data;
};

export const unwrapPaginatedApiResponse = <T>(response: ApiPaginatedResponse<T>): PaginatedResult<T> => {
  if (response.error) {
    throw toApiError(response);
  }

  if (response.data === undefined || response.meta === undefined) {
    throw invalidApiResponse('Paginated API success response did not include data and metadata');
  }

  return {
    items: response.data,
    meta: response.meta,
  };
};
