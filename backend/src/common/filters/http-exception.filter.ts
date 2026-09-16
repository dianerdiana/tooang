import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { Prisma } from '@/generated/prisma/client';

import { isTransactionWriteConflict } from '@/common/errors';

import { WinstonLoggerService } from '@/lib/winston-logger.service';

type ExceptionBody = {
  message?: string | string[];
  code?: string;
  details?: Array<{ field?: string; message: string; code?: string; resourceId?: string }>;
};

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  500: 'INTERNAL_SERVER_ERROR',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: WinstonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { route?: { path?: string } }>();
    const normalized = this.normalize(exception);

    if (normalized.status >= 500) {
      this.logger.error('Unhandled request exception', this.errorTrace(exception), {
        requestId: request.header('x-request-id'),
        method: request.method,
        route: (request as unknown as { route?: { path?: string } }).route?.path ?? 'unmatched',
        status: normalized.status,
        errorCategory: exception instanceof Error ? exception.name : 'UnknownError',
      });
    }

    response.status(normalized.status).json({
      error: true,
      message: normalized.message,
      code: normalized.code,
      ...(normalized.details?.length ? { details: normalized.details } : {}),
    });
  }

  private normalize(exception: unknown) {
    if (isTransactionWriteConflict(exception)) {
      return {
        status: HttpStatus.CONFLICT,
        message: 'Concurrent update conflict; retry the request',
        code: 'CONFLICT',
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
          code: 'CONFLICT',
        };
      }
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, message: 'Resource not found', code: 'NOT_FOUND' };
      }
      if (exception.code === 'P2000') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Input value is too long',
          code: 'BAD_REQUEST',
        };
      }
    }

    if (
      exception instanceof Prisma.PrismaClientInitializationError ||
      exception instanceof Prisma.PrismaClientRustPanicError
    ) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body: ExceptionBody = typeof raw === 'object' ? raw : { message: String(raw) };
      const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      return {
        status,
        message: message ?? exception.message,
        code: body.code ?? STATUS_CODES[status] ?? 'HTTP_ERROR',
        details: body.details,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      code: STATUS_CODES[500],
    };
  }

  private errorTrace(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}
