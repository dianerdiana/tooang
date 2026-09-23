import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { ApplicationError } from '@/types/api-response.type';
import { PlatformRole } from '@/types/enums/user-role.enum';

import type { UserSummary } from '../types/users.type';

import { deactivationErrorMessage, platformRoleErrorMessage, UserCards, UsersTable } from './user-management-page';

const user = (platformRole: PlatformRole): UserSummary => ({
  userId: `usr_${platformRole.toLowerCase()}`,
  fullName: `${platformRole} Person`,
  email: `${platformRole.toLowerCase()}@example.com`,
  platformRole,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
});

const collectionProps = {
  users: [user(PlatformRole.USER), user(PlatformRole.ADMIN), user(PlatformRole.SUPER_ADMIN)],
  pendingUserId: undefined,
  failedUserId: undefined,
  mutationError: undefined,
  onDeactivate: () => undefined,
  canManagePlatformRole: false,
  onUpdateRole: () => undefined,
};

describe('user management collections', () => {
  it('renders only the documented safe fields and returned platform roles', () => {
    const markup = renderToStaticMarkup(<UsersTable {...collectionProps} canDeactivate={false} />);

    expect(markup).toContain('USER Person');
    expect(markup).toContain('user@example.com');
    expect(markup).toContain('usr_user');
    expect(markup).toContain('Admin');
    expect(markup).toContain('Super admin');
    expect(markup).not.toContain('passwordHash');
    expect(markup).not.toContain('Deactivate');
  });

  it('shows deactivation for every returned role when permission visibility allows it', () => {
    const table = renderToStaticMarkup(<UsersTable {...collectionProps} canDeactivate />);
    const cards = renderToStaticMarkup(<UserCards {...collectionProps} canDeactivate />);

    expect(table.match(/Deactivate/g)?.length).toBe(3);
    expect(cards.match(/Deactivate/g)?.length).toBe(3);
    expect(table.match(/aria-haspopup="dialog"/g)?.length).toBe(3);
    expect(cards.match(/aria-haspopup="dialog"/g)?.length).toBe(3);
  });

  it('shows platform-role controls only when the specific permission visibility allows it', () => {
    const hidden = renderToStaticMarkup(
      <UsersTable {...collectionProps} canDeactivate={false} canManagePlatformRole={false} />,
    );
    const visible = renderToStaticMarkup(
      <UsersTable {...collectionProps} canDeactivate={false} canManagePlatformRole />,
    );

    expect(hidden).not.toContain('Change platform role for');
    expect(visible.match(/Change platform role for/g)?.length).toBe(3);
    expect(visible).toContain('User');
    expect(visible).toContain('Admin');
    expect(visible).toContain('Super admin');
  });

  it('uses safe capability copy while preserving expected conflict messages', () => {
    const error = (httpStatus: number, message: string): ApplicationError => ({
      error: true,
      code: httpStatus === 403 ? 'FORBIDDEN' : 'CONFLICT',
      message,
      httpStatus,
      isNetworkError: false,
    });

    expect(deactivationErrorMessage(error(403, 'ADMIN cannot deactivate this target'))).toBe(
      'Your capabilities changed and you can no longer access this content.',
    );
    expect(deactivationErrorMessage(error(409, 'The last active SUPER_ADMIN cannot be deactivated'))).toBe(
      'The last active SUPER_ADMIN cannot be deactivated',
    );
    expect(platformRoleErrorMessage(error(409, 'The last active SUPER_ADMIN cannot be changed'))).toBe(
      'The last active SUPER_ADMIN cannot be changed',
    );
  });
});
