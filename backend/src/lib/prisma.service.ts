import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from '@/generated/prisma/client';

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
  private readonly logQueries: boolean;

  constructor(logger: WinstonLoggerService, configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>(APP_CONFIG.dbConnectionString);

    const adapter = new PrismaPg({
      connectionString,
    });

    super({ ...clientOptions, adapter });

    this.logger = logger;
    this.logQueries = configService.getOrThrow(APP_CONFIG.nodeEnv) !== 'production';
  }

  async onModuleInit() {
    this.$on('info', (e) => this.logger.log(e.message));
    this.$on('warn', (e) => this.logger.warn(e.message));
    this.$on('error', (e) => this.logger.error(e.message));
    this.$on('query', (e) => {
      if (this.logQueries) this.logger.debug(e.query);
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
