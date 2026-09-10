export type ResponseMeta = {
  page?: number;
  limit?: number;
  search?: string;
  column?: string;
  sort?: 'asc' | 'desc';
  totalItems?: number;
  totalPages?: number;
};

export type ApiErrorItem = {
  field?: string;
  message: string;
};

export class HttpResponse<TData = unknown> {
  error: boolean;
  message: string;
  data?: TData;
  meta?: ResponseMeta;
  code?: string;
  details?: ApiErrorItem[];

  constructor(
    args: {
      error?: boolean;
      message?: string;
      data?: TData;
      meta?: ResponseMeta;
      code?: string;
      details?: ApiErrorItem[];
    } = {},
  ) {
    const { error = false, message = 'ok', data, meta, code, details } = args;

    this.error = error;
    this.message = message;

    if (data !== undefined) this.data = data;
    if (meta !== undefined) this.meta = meta;
    if (code !== undefined) this.code = code;
    if (details?.length) this.details = details;
  }

  static success<TData>(
    args: {
      data?: TData;
      message?: string;
      meta?: ResponseMeta;
    } = {},
  ) {
    return new HttpResponse<TData>({
      error: false,
      message: args.message ?? 'ok',
      data: args.data,
      meta: args.meta,
    });
  }

  static error(message: string, details?: ApiErrorItem[], code?: string) {
    return new HttpResponse<never>({
      error: true,
      message,
      code,
      details,
    });
  }
}
