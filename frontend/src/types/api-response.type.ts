export type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

export type ResponseMeta = {
  page?: number;
  limit?: number;
  totalItems?: number;
  totalPages?: number;
};

export type SuccessResponse<T> = {
  error: false;
  message: string;
  data: T;
  meta?: ResponseMeta;
};

export type ErrorResponse = {
  error: true;
  message: string;
  code?: string;
  details?: ApiErrorDetail[];
  httpStatus?: number;
  isNetworkError?: boolean;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export type PaginatedResult<T> = {
  items: T;
  meta: ResponseMeta;
};
