import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { APP_CONFIG } from '../common/constants';

import { WinstonLoggerService } from './winston-logger.service';

const clientOptions = {
  log: [
    { emit: 'event' as const, level: 'info' as const },
    { emit: 'event' as const, level: 'query' as const },
    { emit: 'event' as const, level: 'warn' as const },
    { emit: 'event' as const, level: 'error' as const },
  ],
  adapter: new PrismaPg({}),
} satisfies Prisma.PrismaClientOptions;

@Injectable()
export class PrismaService
  extends PrismaClient<typeof clientOptions, 'info' | 'query' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: WinstonLoggerService;

  constructor(logger: WinstonLoggerService, configService: ConfigService) {
    const connectionString =
      configService.get<string>(APP_CONFIG.dbConnectionString) ?? process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is required. Set it in .env or export it in the shell before starting the app.',
      );
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({ ...clientOptions, adapter });

    this.logger = logger;
  }

  async onModuleInit() {
    this.$on('info', (e) => this.logger.log(e.message));
    this.$on('warn', (e) => this.logger.warn(e.message));
    this.$on('error', (e) => this.logger.error(e.message));
    this.$on('query', (e) => this.logger.log(e.query));

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
