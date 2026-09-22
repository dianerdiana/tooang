import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { AbilityProvider } from '@casl/react';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { createAbilityForUser } from '../create-ability';
import { usePermissions } from '../hooks/use-permissions';

import { AppAbilityProvider, Can } from './ability-context';
import { AuthContext, type AuthContextType } from './auth-context';

const user: AuthenticatedUser = {
  userId: 'usr_1',
  fullName: 'Permission Tester',
  email: 'permissions@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [
    {
      placeId: 'place_one',
      role: PlaceMemberRole.CASHIER,
      permissions: [PERMISSION.ORDER_CONFIRM],
      effectivePermissions: [PERMISSION.ORDER_CONFIRM],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const authContextValue = (currentUser: AuthenticatedUser | null): AuthContextType => ({
  isAuthenticated: currentUser !== null,
  isInitialLoading: false,
  login: async () => {
    throw new Error('Not used by this test');
  },
  register: async () => {
    throw new Error('Not used by this test');
  },
  logout: async () => undefined,
  user: currentUser,
});

const PermissionProbe = () => {
  const { can, cannot, canAtPlace, cannotAtPlace } = usePermissions();

  return (
    <span>
      {can(PERMISSION.PROFILE_READ) ? 'can-profile' : 'cannot-profile'}|
      {cannot(PERMISSION.USER_DEACTIVATE) ? 'cannot-deactivate' : 'can-deactivate'}|
      {canAtPlace('place_one', PERMISSION.ORDER_CONFIRM) ? 'can-confirm' : 'cannot-confirm'}|
      {cannotAtPlace('place_two', PERMISSION.ORDER_CONFIRM) ? 'cannot-confirm-other' : 'can-confirm-other'}
    </span>
  );
};

describe('Can', () => {
  it('declaratively renders or hides content from the provided ability', () => {
    const ability = createAbilityForUser(user);
    const markup = renderToStaticMarkup(
      <AbilityProvider value={ability}>
        <Can I={PERMISSION.PROFILE_READ} a='Platform'>
          <span>allowed</span>
        </Can>
        <Can I={PERMISSION.USER_DEACTIVATE} a='Platform'>
          <span>denied</span>
        </Can>
      </AbilityProvider>,
    );

    expect(markup).toContain('allowed');
    expect(markup).not.toContain('denied');
  });

  it('supports disabling an unauthorized action with passThrough', () => {
    const ability = createAbilityForUser(user);
    const markup = renderToStaticMarkup(
      <AbilityProvider value={ability}>
        <Can I={PERMISSION.USER_DEACTIVATE} a='Platform' passThrough>
          {({ isAllowed }) => <button disabled={!isAllowed}>Deactivate user</button>}
        </Can>
      </AbilityProvider>,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Deactivate user');
  });

  it('exposes scoped can and cannot helpers', () => {
    const markup = renderToStaticMarkup(
      <AbilityProvider value={createAbilityForUser(user)}>
        <PermissionProbe />
      </AbilityProvider>,
    );

    expect(markup).toContain('can-profile|cannot-deactivate|can-confirm|cannot-confirm-other');
  });

  it('rebuilds permissions from changed auth metadata and clears them without a user', () => {
    const renderProvider = (currentUser: AuthenticatedUser | null) =>
      renderToStaticMarkup(
        <AuthContext.Provider value={authContextValue(currentUser)}>
          <AppAbilityProvider>
            <Can I={PERMISSION.PROFILE_READ} a='Platform'>
              <span>profile-visible</span>
            </Can>
          </AppAbilityProvider>
        </AuthContext.Provider>,
      );

    expect(renderProvider(user)).toContain('profile-visible');
    expect(renderProvider({ ...user, permissions: [] })).not.toContain('profile-visible');
    expect(renderProvider(null)).not.toContain('profile-visible');
  });
});
