import axios from 'axios';

import type { ApiErrorResponse, ApplicationError } from '@/types/api-response.type';

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<ApiErrorResponse>;

  return data.error === true && typeof data.message === 'string' && typeof data.code === 'string';
};

export const isApplicationError = (value: unknown): value is ApplicationError =>
  isApiErrorResponse(value) && typeof (value as Partial<ApplicationError>).isNetworkError === 'boolean';

export const toApiError = (error: unknown): ApplicationError => {
  if (isApplicationError(error)) return error;

  if (isApiErrorResponse(error)) {
    return {
      ...error,
      isNetworkError: false,
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const httpStatus = error.response?.status;

    if (isApiErrorResponse(data)) {
      return {
        ...data,
        httpStatus,
        isNetworkError: false,
      };
    }

    return {
      error: true,
      message: error.message || 'Request failed',
      code: error.code || (error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
      httpStatus,
      isNetworkError: !error.response,
    };
  }

  if (error instanceof Error) {
    return {
      error: true,
      message: error.message,
      code: 'APPLICATION_ERROR',
      isNetworkError: false,
    };
  }

  return {
    error: true,
    message: 'Unknown error',
    code: 'UNKNOWN_ERROR',
    isNetworkError: false,
  };
};
