import axios from 'axios';

import type { ErrorResponse } from '@/types/api-response.type';

export const isErrorResponse = (value: unknown): value is ErrorResponse => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<ErrorResponse>;

  return data.error === true && typeof data.message === 'string';
};

export const toApiError = (e: unknown): ErrorResponse => {
  if (isErrorResponse(e)) return e;

  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const httpStatus = e.response?.status;

    if (isErrorResponse(data)) {
      return {
        error: true,
        message: data.message,
        code: data.code,
        details: data.details,
        httpStatus,
        isNetworkError: false,
      };
    }

    return {
      error: true,
      message: e.message || 'Request failed',
      code: e.code,
      httpStatus,
      isNetworkError: !e.response,
    };
  }

  if (e instanceof Error) {
    return {
      error: true,
      message: e.message,
    };
  }

  return {
    error: true,
    message: 'Unknown error',
  };
};
