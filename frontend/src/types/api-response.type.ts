export type ApiResponseStatus = 'success' | 'error';

export type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
};

export type ResponseMeta = {
  page?: number;
  limit?: number;
  search?: string;
  column?: string;
  sort?: 'asc' | 'desc';
  totalItems?: number;
  totalPages?: number;
};

export type SuccessResponse<T> = {
  status: 'success';
  message: string;
  data: T;
  meta?: ResponseMeta;
};

export type ErrorResponse = {
  status: 'error';
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
