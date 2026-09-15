import { createHmac } from 'node:crypto';

import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { APP_CONFIG } from '@/common/constants';

import { WinstonLoggerService } from '../../lib';

import { AUTH_RATE_LIMIT_POLICIES, type AuthRateLimitPolicy } from './auth-rate-limit';
import { AuthRateLimitRepository } from './auth-rate-limit.repository';

@Injectable()
export class AuthRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly sourceSecret: string;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly repository: AuthRateLimitRepository,
    private readonly logger: WinstonLoggerService,
    config: ConfigService,
  ) {
    this.sourceSecret = config.getOrThrow<string>(APP_CONFIG.rateLimitSourceSecret);
  }

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => void this.cleanup(), 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  sourceHash(ip: string): string {
    const canonical = ip
      .trim()
      .toLowerCase()
      .replace(/^::ffff:/, '');
    return createHmac('sha256', this.sourceSecret).update(canonical, 'utf8').digest('hex');
  }

  async consume(
    policyName: AuthRateLimitPolicy,
    ip: string,
    requestId?: string,
  ): Promise<number | null> {
    const policies = AUTH_RATE_LIMIT_POLICIES[policyName];
    const now = new Date();
    const sourceHash = this.sourceHash(ip);
    try {
      const buckets = await this.repository.consume(sourceHash, policies, now);
      const retryAfter = buckets.reduce((longest, bucket) => {
        const policy = policies.find(({ name }) => name === bucket.policy)!;
        if (bucket.attemptCount <= policy.limit) return longest;
        const remaining = Math.max(
          1,
          Math.ceil(
            (bucket.windowStartedAt.getTime() + policy.windowSeconds * 1000 - now.getTime()) / 1000,
          ),
        );
        return Math.max(longest, remaining);
      }, 0);
      if (retryAfter) {
        this.logger.warn('Request rate limit exceeded', {
          event: 'request.rate_limit.exceeded',
          policy: policyName,
          sourceHash,
          requestId,
        });
      }
      return retryAfter || null;
    } catch (error) {
      this.logger.error('Request rate-limit datastore failure', this.errorTrace(error));
      throw new ServiceUnavailableException('Rate-limit service temporarily unavailable');
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.repository.deleteExpired(new Date());
    } catch (error) {
      this.logger.error('Request rate-limit cleanup failed', this.errorTrace(error));
    }
  }

  private errorTrace(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
