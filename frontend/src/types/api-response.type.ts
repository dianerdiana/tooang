export type ApiErrorDetail = {
  field?: string;
  message: string;
  code?: string;
  resourceId?: string;
};

export type ApiPaginationMeta = {
  page?: number;
  limit?: number;
  search?: string;
  column?: string;
  sort?: 'asc' | 'desc';
  totalItems?: number;
  totalPages?: number;
};

export type ApiSuccessResponse<TData = unknown> = {
  error: false;
  message: string;
  data?: TData;
  meta?: ApiPaginationMeta;
};

export type ApiErrorResponse = {
  error: true;
  message: string;
  code: string;
  details?: ApiErrorDetail[];
};

export type ApplicationError = ApiErrorResponse & {
  httpStatus?: number;
  isNetworkError: boolean;
};

export type ApiResponse<TData = unknown> = ApiSuccessResponse<TData> | ApiErrorResponse;

export type ApiDataResponse<TData> = (ApiSuccessResponse<TData> & { data: TData }) | ApiErrorResponse;

export type ApiPaginatedResponse<TData> =
  (ApiSuccessResponse<TData> & { data: TData; meta: ApiPaginationMeta }) | ApiErrorResponse;

export type PaginatedResult<T> = {
  items: T;
  meta: ApiPaginationMeta;
};
