import { Injectable, type LoggerService } from '@nestjs/common';

import * as winston from 'winston';

import envConfig from '../config/env';

const SENSITIVE_KEY = new RegExp(
  'authorization|cookie|password|access.?token|refresh.?token|token.?hash|' +
    'verification.?token|token|secret|private.?key',
  'iu',
);

export function redactLogString(value: string): string {
  return value
    .replace(/Bearer\s+[^\s,;]+/giu, 'Bearer [REDACTED]')
    .replace(/\/order-verifications\/[^\s/?#]+/giu, '/order-verifications/[REDACTED]')
    .replace(/\bTNG-\d{8}-[0-9A-HJKMNP-TV-Z]{8}\b/giu, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[REDACTED]')
    .replace(/\b[A-Za-z0-9_-]{43}\b/gu, '[REDACTED]');
}

export function redactLogValue(value: unknown): unknown {
  if (typeof value === 'string') return redactLogString(value);
  if (Array.isArray(value)) return value.map(redactLogValue);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactLogValue(child),
    ]),
  );
}

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;
  private env = envConfig();

  constructor() {
    const isProduction = this.env.app.nodeEnv === 'production';

    this.logger = winston.createLogger({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp as string} [${level.toUpperCase()}]: ${message as string}`;
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${timestamp as string} [${level}]: ${message as string}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: Record<string, unknown>) {
    this.logger.info(redactLogString(message), redactLogValue(context));
  }

  error(message: string, trace?: string, context?: Record<string, unknown>) {
    this.logger.error(redactLogString(message), {
      ...(redactLogValue(context) as Record<string, unknown> | undefined),
      ...(trace ? { trace: redactLogString(trace) } : {}),
    });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(redactLogString(message), redactLogValue(context));
  }

  debug(message: string) {
    this.logger.debug(redactLogString(message));
  }

  verbose(message: string) {
    this.logger.verbose(redactLogString(message));
  }
}
