import { Injectable, type LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as winston from 'winston';

import { APP_CONFIG } from '../common/constants';
import { currentRequestId } from '../common/observability/request-context';

const SENSITIVE_KEY = new RegExp(
  'authorization|set.?cookie|cookie|password|access.?token|refresh.?token|session.?token|' +
    'token.?hash|verification.?(token|code)|order.?code|token|secret|credential|' +
    'api.?key|private.?key|database.?url|connection.?string|provider.?response',
  'iu',
);

export function redactLogString(value: string): string {
  return value
    .replace(/\bpostgres(?:ql)?:\/\/[^\s]+/giu, '[REDACTED_DATABASE_URL]')
    .replace(/Bearer\s+[^\s,;]+/giu, 'Bearer [REDACTED]')
    .replace(/\/order-verifications\/[^\s/?#]+/giu, '/order-verifications/[REDACTED]')
    .replace(/\bTNG-\d{8}-[0-9A-HJKMNP-TV-Z]{8}\b/giu, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{43}\b/gu, '[REDACTED]');
}

export function redactLogValue(value: unknown): unknown {
  return redactNested(value, new WeakSet<object>());
}

function redactNested(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactLogString(value);
  if (Array.isArray(value)) {
    if (seen.has(value)) return '[REDACTED_CYCLE]';
    seen.add(value);
    return value.map((item) => redactNested(item, seen));
  }
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (seen.has(value)) return '[REDACTED_CYCLE]';
  seen.add(value);
  if (value instanceof Error) {
    return redactNested(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: value.cause,
      },
      seen,
    );
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactNested(child, seen),
    ]),
  );
}

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(config: ConfigService) {
    const isProduction = config.getOrThrow(APP_CONFIG.nodeEnv) === 'production';
    const redact = winston.format((info) => {
      const cleaned = redactLogValue(info) as winston.Logform.TransformableInfo;
      Object.keys(info).forEach((key) => delete info[key]);
      Object.assign(info, cleaned);
      return info;
    });

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(winston.format.timestamp(), redact(), winston.format.json()),
      transports: [
        new winston.transports.Console({
          format: isProduction
            ? winston.format.json()
            : winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                  const suffix = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
                  return `${String(timestamp)} [${level}]: ${String(message)}${suffix}`;
                }),
              ),
        }),
      ],
    });
  }

  private context(context?: Record<string, unknown>): Record<string, unknown> {
    const requestId = currentRequestId();
    return {
      ...(requestId ? { requestId } : {}),
      ...((redactLogValue(context) as Record<string, unknown> | undefined) ?? {}),
    };
  }

  log(message: string, context?: Record<string, unknown>) {
    this.logger.info(redactLogString(message), this.context(context));
  }

  error(message: string, trace?: string, context?: Record<string, unknown>) {
    this.logger.error(redactLogString(message), {
      ...this.context(context),
      ...(trace ? { trace: redactLogString(trace) } : {}),
    });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(redactLogString(message), this.context(context));
  }

  debug(message: string) {
    this.logger.debug(redactLogString(message));
  }

  verbose(message: string) {
    this.logger.verbose(redactLogString(message));
  }
}
