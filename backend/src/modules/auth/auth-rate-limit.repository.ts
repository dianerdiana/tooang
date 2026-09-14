import { Injectable } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

type ConsumedBucket = {
  policy: string;
  attemptCount: number;
  windowStartedAt: Date;
};

@Injectable()
export class AuthRateLimitRepository {
  constructor(private readonly prisma: PrismaService) {}

  consume(
    sourceHash: string,
    policies: ReadonlyArray<{ name: string; limit: number; windowSeconds: number }>,
    now: Date,
  ): Promise<ConsumedBucket[]> {
    return this.prisma.$transaction(async (tx) => {
      const consumed: ConsumedBucket[] = [];
      for (const policy of policies) {
        const expiresAt = new Date(now.getTime() + (policy.windowSeconds + 86400) * 1000);
        const rows = await tx.$queryRaw<
          Array<{
            policy: string;
            attempt_count: number;
            window_started_at: Date;
          }>
        >(Prisma.sql`
          INSERT INTO "auth_rate_limit_buckets"
            ("source_hash", "policy", "window_started_at", "attempt_count", "expires_at", "updated_at")
          VALUES (${sourceHash}, ${policy.name}, ${now}, 1, ${expiresAt}, ${now})
          ON CONFLICT ("source_hash", "policy") DO UPDATE SET
            "attempt_count" = CASE
              WHEN "auth_rate_limit_buckets"."window_started_at"
                + (${policy.windowSeconds} * INTERVAL '1 second') <= ${now}
              THEN 1
              ELSE LEAST("auth_rate_limit_buckets"."attempt_count" + 1, ${policy.limit + 1})
            END,
            "window_started_at" = CASE
              WHEN "auth_rate_limit_buckets"."window_started_at"
                + (${policy.windowSeconds} * INTERVAL '1 second') <= ${now}
              THEN ${now}
              ELSE "auth_rate_limit_buckets"."window_started_at"
            END,
            "expires_at" = ${expiresAt},
            "updated_at" = ${now}
          RETURNING "policy", "attempt_count", "window_started_at"
        `);
        const row = rows[0];
        consumed.push({
          policy: row.policy,
          attemptCount: row.attempt_count,
          windowStartedAt: row.window_started_at,
        });
      }
      return consumed;
    });
  }

  deleteExpired(now: Date) {
    return this.prisma.authRateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } });
  }
}
