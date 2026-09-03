import axios from 'axios';

import type { ErrorResponse } from '@/types/api-response.type';

export const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<ErrorResponse>;

  return data.status === 'error' && typeof data.message === 'string';
};

export const toApiError = (e: unknown): ErrorResponse => {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const httpStatus = e.response?.status;

    if (isErrorResponse(data)) {
      return {
        status: 'error',
        message: data.message,
        code: data.code,
        details: data.details,
        httpStatus,
        isNetworkError: false,
      };
    }

    return {
      status: 'error',
      message: e.message || 'Request failed',
      code: e.code,
      httpStatus,
      isNetworkError: !e.response,
    };
  }

  if (e instanceof Error) {
    return {
      status: 'error',
      message: e.message,
    };
  }

  return {
    status: 'error',
    message: 'Unknown error',
  };
};
