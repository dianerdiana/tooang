import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

import { runWithRequestContext } from '@/common/observability/request-context';

import { WinstonLoggerService } from '@/lib/winston-logger.service';

import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: WinstonLoggerService,
    private readonly metrics: OperationalMetricsService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.headers['x-request-id'];
    const requestId =
      typeof supplied === 'string' && /^[A-Za-z0-9._-]{1,100}$/u.test(supplied)
        ? supplied
        : randomUUID();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);
    const startedAt = performance.now();
    runWithRequestContext(requestId, () => {
      response.on('finish', () => {
        const route = request.route as { path?: string } | undefined;
        const actor = (request as Request & { user?: { userId?: string } }).user;
        const routeTemplate = route?.path ?? request.baseUrl ?? 'unmatched';
        const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
        this.logger.log('HTTP request completed', {
          event: 'http.request.completed',
          method: request.method,
          route: routeTemplate,
          status: response.statusCode,
          durationMs,
          ...(actor?.userId ? { actorUserId: actor.userId } : {}),
        });
        const tags = {
          method: request.method,
          route: routeTemplate,
          statusClass: `${Math.floor(response.statusCode / 100)}xx`,
        };
        this.metrics.increment('http_server_requests_total', tags);
        this.metrics.observe('http_server_request_duration_ms', durationMs, tags);
      });
      next();
    });
  }
}
