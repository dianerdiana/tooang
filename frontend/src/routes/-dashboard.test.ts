import { describe, expect, it } from 'vitest';

import { isRedirect } from '@tanstack/react-router';

import { PlaceMemberRole, PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { Route } from './dashboard';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  userId: 'usr_1',
  fullName: 'Route User',
  email: 'route@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const runBeforeLoad = (
  auth: { isAuthenticated: boolean; user: AuthenticatedUser | null },
  search: { placeId?: string } = {},
) => {
  try {
    Route.options.beforeLoad?.({
      context: { auth },
      location: { href: '/dashboard', pathname: '/dashboard' },
      search,
    } as never);
    return null;
  } catch (error) {
    return error;
  }
};

describe('/dashboard route guard', () => {
  it('defines a dashboard-level error boundary', () => {
    expect(Route.options.errorComponent).toBeTypeOf('function');
  });

  it('guards direct unauthenticated access at the route boundary', () => {
    const result = runBeforeLoad({ isAuthenticated: false, user: null });

    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) {
      expect(result.options).toMatchObject({
        to: '/login',
        search: { redirect: '/dashboard' },
        replace: true,
      });
    }
  });

  it('redirects an authenticated user without management capabilities', () => {
    const result = runBeforeLoad({ isAuthenticated: true, user: user() });

    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) expect(result.options).toMatchObject({ to: '/', replace: true });
  });

  it('allows a membership-capable user through the route boundary', () => {
    const owner = user({
      placeMemberships: [
        {
          placeId: 'place_owner',
          place: { name: 'Owner Place', isPublished: true, isOrderingEnabled: true },
          role: PlaceMemberRole.OWNER,
          permissions: [PERMISSION.PLACE_UPDATE],
          effectivePermissions: [PERMISSION.PLACE_UPDATE],
        },
      ],
    });

    expect(runBeforeLoad({ isAuthenticated: true, user: owner })).toBeNull();
  });

  it('canonicalizes a stale selected place to the first accessible membership', () => {
    const owner = user({
      placeMemberships: [
        {
          placeId: 'place_owner',
          place: { name: 'Owner Place', isPublished: true, isOrderingEnabled: true },
          role: PlaceMemberRole.OWNER,
          permissions: [PERMISSION.PLACE_UPDATE],
          effectivePermissions: [PERMISSION.PLACE_UPDATE],
        },
      ],
    });

    const result = runBeforeLoad({ isAuthenticated: true, user: owner }, { placeId: 'stale_place' });

    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) {
      expect(result.options).toMatchObject({
        to: '/dashboard',
        search: { placeId: 'place_owner' },
        replace: true,
      });
    }
  });
});
