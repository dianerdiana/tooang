import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { PlatformRole, PrismaClient } from '../generated/prisma/client.js';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service.js';
import { PasswordPolicyService } from '../src/modules/auth/password-policy.service.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SEED_SUPER_ADMIN_FULL_NAME?.trim() || 'Super Administrator';
  if (!email && !password) return;
  if (!email || !password) {
    throw new Error('Valid SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are both required');
  }
  new PasswordPolicyService(new ConfigService()).assertAllowed(password);
  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const minimumRounds =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 4 : 12;
  if (!Number.isInteger(bcryptRounds) || bcryptRounds < minimumRounds || bcryptRounds > 31) {
    throw new Error(`BCRYPT_ROUNDS must be an integer between ${minimumRounds} and 31`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (
      existing.platformRole !== PlatformRole.SUPER_ADMIN ||
      existing.deletedAt ||
      existing.deletionRequestedAt
    ) {
      throw new Error(
        'Refusing to promote or reactivate an existing account during seed; use an audited administrative workflow',
      );
    }
    return;
  }

  const { randomUUID } = await import('node:crypto');
  await prisma.user.create({
    data: {
      userId: `usr_${randomUUID().replaceAll('-', '')}`,
      fullName,
      email,
      passwordHash: await bcrypt.hash(
        preHashPassword(password),
        bcryptRounds,
      ),
      platformRole: PlatformRole.SUPER_ADMIN,
    },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
