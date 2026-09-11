import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import { PrismaClient, RoleCode } from '../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required to seed the database');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const roleNames: Record<RoleCode, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  OWNER: 'Place Owner',
  USER: 'User',
};

async function main() {
  for (const code of Object.values(RoleCode)) {
    await prisma.role.upsert({
      where: { code },
      update: { name: roleNames[code] },
      create: { code, name: roleNames[code] },
    });
  }

  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const fullName = process.env.SEED_SUPER_ADMIN_FULL_NAME?.trim() || 'Super Administrator';
  if (!email && !password) return;
  if (!email || !password || Buffer.byteLength(password, 'utf8') < 8) {
    throw new Error('Valid SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD are both required');
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: existing.id, roleId: role.id } },
      update: {},
      create: { userId: existing.id, roleId: role.id },
    });
    return;
  }

  const { randomUUID } = await import('node:crypto');
  await prisma.user.create({
    data: {
      userId: `usr_${randomUUID().replaceAll('-', '')}`,
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      roles: { create: { roleId: role.id } },
    },
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
