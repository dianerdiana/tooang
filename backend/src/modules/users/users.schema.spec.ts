import { PlatformRole } from '@/generated/prisma/client';

import {
  createUserSchema,
  listUsersSchema,
  platformRoleSchema,
  updateMeSchema,
} from './users.schema';

describe('Users schemas', () => {
  it('normalizes supported profile fields', () => {
    expect(
      updateMeSchema.parse({ fullName: '  Dian Erdiana  ', email: '  DIAN@EXAMPLE.COM  ' }),
    ).toEqual({ fullName: 'Dian Erdiana', email: 'dian@example.com' });
  });

  it.each([
    {},
    { fullName: '   ' },
    { email: 'not-an-email' },
    { platformRole: PlatformRole.ADMIN },
    { permissions: ['user.read'] },
    { deletionRequestedAt: new Date().toISOString() },
    { fullName: 'A', unexpected: true },
  ])('rejects an invalid or protected profile update: %p', (input) => {
    expect(updateMeSchema.safeParse(input).success).toBe(false);
  });

  it('applies bounded pagination defaults and rejects oversized pages', () => {
    expect(listUsersSchema.parse({})).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(listUsersSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts only schema-defined platform roles', () => {
    expect(platformRoleSchema.parse({ platformRole: PlatformRole.SUPER_ADMIN })).toEqual({
      platformRole: PlatformRole.SUPER_ADMIN,
    });
    expect(platformRoleSchema.safeParse({ platformRole: 'OWNER' }).success).toBe(false);
    expect(
      platformRoleSchema.safeParse({ platformRole: PlatformRole.USER, extra: true }).success,
    ).toBe(false);
  });

  it('normalizes manual account input and requires an explicit valid role', () => {
    expect(
      createUserSchema.parse({
        fullName: '  New User ',
        email: ' NEW@EXAMPLE.COM ',
        password: 'unique passphrase',
        platformRole: PlatformRole.USER,
      }),
    ).toEqual({
      fullName: 'New User',
      email: 'new@example.com',
      password: 'unique passphrase',
      platformRole: PlatformRole.USER,
    });
    expect(
      createUserSchema.safeParse({
        fullName: 'New User',
        email: 'new@example.com',
        password: 'long enough',
        platformRole: PlatformRole.USER,
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
