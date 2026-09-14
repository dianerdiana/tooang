import { Injectable, type LoggerService } from '@nestjs/common';

import * as winston from 'winston';

import envConfig from '../config/env';

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
    this.logger.info(message, context);
  }

  error(message: string, trace?: string, context?: Record<string, unknown>) {
    this.logger.error(message, { ...context, ...(trace ? { trace } : {}) });
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.logger.warn(message, context);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}
