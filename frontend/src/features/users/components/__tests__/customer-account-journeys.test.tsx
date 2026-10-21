// @vitest-environment jsdom

import { expect, it, vi } from 'vitest';

import { screen, waitFor } from '@testing-library/react';

import { api } from '@/configs/api-config';

import { AUTH_SESSION_QUERY_KEY } from '@/features/auth/queries/auth-session.query';
import { authService } from '@/features/auth/services/auth.service';
import { CHECKOUT_ATTEMPT_STORAGE_PREFIX } from '@/features/orders/utils/checkout-attempt';

import { INTENT_STORAGE_KEY } from '@/utils/auth/protected-action-intent';

import { PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { CustomerProfilePage } from '../customer-profile-page';

import { renderWithCustomerProviders } from '@/test/customer-test-utils';

const session: AuthenticatedUser = {
  userId: '123e4567-e89b-42d3-a456-426614174000',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ, PERMISSION.PROFILE_UPDATE, PERMISSION.ACCOUNT_DELETION_REQUEST],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

it('clears all private client state when logout fails remotely', async () => {
  vi.spyOn(authService, 'logout').mockRejectedValue(new Error('offline'));
  const removeToken = vi.spyOn(api, 'removeToken').mockImplementation(() => undefined);
  const rendered = renderWithCustomerProviders({
    component: <CustomerProfilePage />,
    routePath: '/account/profile',
    initialEntry: '/account/profile',
    session,
    theme: 'light',
  });
  rendered.queryClient.setQueryData(['orders', 'list', 'own'], { orders: [{ orderId: 'private-order' }] });
  sessionStorage.setItem(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${session.userId}.place-id`, '{}');
  sessionStorage.setItem(INTENT_STORAGE_KEY, '{}');

  await rendered.actor.click(await screen.findByRole('button', { name: 'Sign out' }));

  await waitFor(() => expect(rendered.router.state.location.pathname).toBe('/'));
  expect(removeToken).toHaveBeenCalledOnce();
  expect(rendered.queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toBeNull();
  expect(rendered.queryClient.getQueryData(['orders', 'list', 'own'])).toBeUndefined();
  expect(sessionStorage.getItem(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${session.userId}.place-id`)).toBeNull();
  expect(sessionStorage.getItem(INTENT_STORAGE_KEY)).toBeNull();
});
