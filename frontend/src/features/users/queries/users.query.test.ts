import { describe, expect, it } from 'vitest';

import { PlatformRole } from '@/types/enums/user-role.enum';

import { normalizeUserListParams, parseUsersSearch, platformRoleUpdateSchema } from '../schemas/users.schema';

import { usersKeys } from './users.key';

describe('user list state', () => {
  it('normalizes every documented route parameter and strips unsupported values', () => {
    expect(
      parseUsersSearch({
        page: '2',
        limit: '50',
        search: '  dian@example.com ',
        platformRole: PlatformRole.ADMIN,
        sortBy: 'email',
        sortOrder: 'asc',
        ignored: 'value',
      }),
    ).toEqual({
      page: 2,
      limit: 50,
      search: 'dian@example.com',
      platformRole: PlatformRole.ADMIN,
      sortBy: 'email',
      sortOrder: 'asc',
    });
  });

  it('falls back safely for empty, out-of-range, or unsupported values', () => {
    expect(
      normalizeUserListParams({
        page: -1,
        limit: 101,
        search: ' ',
        platformRole: 'OWNER' as PlatformRole,
        sortBy: 'role' as 'createdAt',
        sortOrder: 'sideways' as 'asc',
      }),
    ).toEqual({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  });

  it('isolates list caches by pagination, filters, and sorting', () => {
    const base = usersKeys.list({ page: 1, search: 'dian', platformRole: PlatformRole.USER });
    expect(base).not.toEqual(usersKeys.list({ page: 2, search: 'dian', platformRole: PlatformRole.USER }));
    expect(base).not.toEqual(usersKeys.list({ page: 1, search: 'dian', platformRole: PlatformRole.ADMIN }));
    expect(base).not.toEqual(usersKeys.list({ page: 1, search: 'dian', sortBy: 'email', sortOrder: 'asc' }));
  });

  it('provides stable future detail keys under the users namespace', () => {
    expect(usersKeys.detail('usr_one')).toEqual(['users', 'detail', 'usr_one']);
    expect(usersKeys.detail('usr_one')).not.toEqual(usersKeys.detail('usr_two'));
  });

  it('accepts only strict documented platform-role update payloads', () => {
    expect(platformRoleUpdateSchema.parse({ platformRole: PlatformRole.SUPER_ADMIN })).toEqual({
      platformRole: PlatformRole.SUPER_ADMIN,
    });
    expect(() => platformRoleUpdateSchema.parse({ platformRole: 'OWNER' })).toThrow();
    expect(() => platformRoleUpdateSchema.parse({ platformRole: PlatformRole.USER, custom: true })).toThrow();
  });
});
