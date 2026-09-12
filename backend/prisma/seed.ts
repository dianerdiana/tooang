import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import { PlatformRole, PrismaClient } from '../generated/prisma/client.js';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SEED_SUPER_ADMIN_FULL_NAME?.trim() || 'Super Administrator';
  if (!email && !password) return;
  if (!email || !password || Buffer.byteLength(password, 'utf8') < 8) {
    throw new Error('Valid SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are both required');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { platformRole: PlatformRole.SUPER_ADMIN },
    });
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
        Number(process.env.BCRYPT_ROUNDS ?? 12),
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
