// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { useQuery } from '@tanstack/react-query';
import { cleanup, screen, waitFor } from '@testing-library/react';

import { api } from '@/configs/api-config';

import { LoginForm } from '@/features/auth/components/login-form';
import {
  ProtectedActionRecoveryNotice,
  useProtectedActionRecovery,
} from '@/features/auth/components/protected-action-recovery';
import { RegisterForm } from '@/features/auth/components/register-form';
import { authService } from '@/features/auth/services/auth.service';
import { cartKeys, cartQueryOptions } from '@/features/cart/queries/cart.query';
import { cartService } from '@/features/cart/services/cart.service';
import type { Cart } from '@/features/cart/types/cart.type';
import { PublicMenuItemDetail } from '@/features/menu-items/components/public-menu-item-detail';
import type { PublicMenuItem } from '@/features/menu-items/types/menu-items.type';
import { CustomerOrdersPage } from '@/features/orders/components/customer-orders-page';
import { ordersService } from '@/features/orders/services/orders.service';
import { CHECKOUT_ATTEMPT_STORAGE_PREFIX } from '@/features/orders/utils/checkout-attempt';
import { reviewsService } from '@/features/reviews/services/reviews.service';

import {
  INTENT_STORAGE_KEY,
  type ProtectedActionIntent,
  readProtectedActionIntent,
} from '@/utils/auth/protected-action-intent';
import { useAuth } from '@/utils/hooks/use-auth';

import { PlatformRole } from '@/types/enums/user-role.enum';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { renderWithCustomerProviders } from '@/test/customer-test-utils';
import { applicationError, mockServiceFailure, mockServiceSuccess } from '@/test/mock-boundaries';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';
const categoryId = '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8';
const menuUrl = '/places/warung-kita/menu';

const session: AuthenticatedUser = {
  userId: '68d7c23d-ef58-43b0-8658-f4f2d5ed8e74',
  fullName: 'Dian Erdiana',
  email: 'dian@example.com',
  platformRole: PlatformRole.USER,
  permissions: [],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-09-29T00:00:00.000Z',
  updatedAt: '2026-09-29T00:00:00.000Z',
};

const item: PublicMenuItem & { categoryName: string } = {
  menuItemId,
  categoryId,
  categoryName: 'Cold drinks',
  name: 'Iced tea',
  description: 'Fresh tea over ice',
  type: 'DRINK',
  price: 12_500,
  isAvailable: true,
  sortOrder: 1,
  imageUrl: null,
};

const emptyCart: Cart = {
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
};

const cartWithRestoredDraft: Cart = {
  cartId: '8f95e179-a74f-46e0-aea8-e796a297c667',
  placeId,
  distinctItemCount: 1,
  aggregateQuantity: 2,
  items: [
    {
      menuItemId,
      name: item.name,
      type: item.type,
      category: { categoryId, name: item.categoryName },
      unitPrice: item.price,
      quantity: 2,
      note: 'No ice',
    },
  ],
  removedItems: [],
};

function ItemStage({ restoredIntent }: { restoredIntent?: Extract<ProtectedActionIntent, { kind: 'add-to-cart' }> }) {
  const { isAuthenticated } = useAuth();
  const cart = useQuery(cartQueryOptions(placeId, false));

  return (
    <PublicMenuItemDetail
      cart={cart.data}
      cartReady
      isAuthenticated={isAuthenticated}
      placeId={placeId}
      placeSlug='warung-kita'
      item={item}
      orderingEnabled
      returnTo={menuUrl}
      restoredIntent={restoredIntent}
    />
  );
}

function RecoveredItemStage() {
  const recovery = useProtectedActionRecovery({
    currentUrl: menuUrl,
    placeId,
    placeSlug: 'warung-kita',
    menuItemId,
  });
  const restoredIntent =
    recovery.status === 'consumed' && recovery.intent.kind === 'add-to-cart' ? recovery.intent : undefined;

  return (
    <>
      <ProtectedActionRecoveryNotice result={recovery} focusRestoredDraft />
      <ItemStage key={restoredIntent?.id ?? 'normal'} restoredIntent={restoredIntent} />
    </>
  );
}

describe('customer authentication, cart, and checkout journeys', () => {
  it('carries an unauthenticated item draft through registration and login, then adds only after confirmation', async () => {
    const reviews = mockServiceSuccess(reviewsService, 'listPublicMenuItemReviews', {
      reviews: [],
      summary: { reviewCount: 0, averageRating: null },
      meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
    });
    const firstStage = renderWithCustomerProviders({
      component: <ItemStage />,
      routePath: menuUrl,
      initialEntry: menuUrl,
      session: null,
      theme: 'light',
      querySeeds: [[cartKeys.place(placeId), emptyCart]],
    });

    await firstStage.actor.click(await screen.findByRole('button', { name: 'View details' }));
    await firstStage.actor.click(screen.getByRole('button', { name: /increase iced tea quantity/i }));
    await firstStage.actor.type(screen.getByLabelText('Item note (optional)'), 'No ice');
    await firstStage.actor.click(screen.getByRole('link', { name: 'Sign in to add 2' }));

    await waitFor(() => expect(firstStage.router.state.location.pathname).toBe('/login'));
    const intent = readProtectedActionIntent();
    expect(intent).toMatchObject({
      kind: 'add-to-cart',
      payload: { placeId, placeSlug: 'warung-kita', menuItemId, quantity: 2, note: 'No ice' },
      returnTo: menuUrl,
    });
    expect(firstStage.router.state.location.search).toMatchObject({ redirect: menuUrl, intent: intent?.id });
    expect(reviews).toHaveBeenCalledWith(placeId, menuItemId, { page: 1, limit: 10 });

    cleanup();
    const registeredUser = {
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      platformRole: session.platformRole,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
    const register = mockServiceSuccess(authService, 'register', { user: registeredUser });
    const registrationStage = renderWithCustomerProviders({
      component: <RegisterForm intentId={intent?.id} redirectTo={menuUrl} />,
      routePath: '/register',
      initialEntry: `/register?redirect=${encodeURIComponent(menuUrl)}&intent=${intent?.id}`,
      session: null,
      theme: 'light',
    });

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeVisible();
    await registrationStage.actor.type(screen.getByLabelText('Full name'), session.fullName);
    await registrationStage.actor.type(screen.getByLabelText('Email'), session.email);
    await registrationStage.actor.type(screen.getByLabelText('Password'), ' exact password ');
    await registrationStage.actor.type(screen.getByLabelText('Confirm password'), ' exact password ');
    await registrationStage.actor.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(registrationStage.router.state.location.pathname).toBe('/login'));
    expect(register).toHaveBeenCalledWith({
      fullName: session.fullName,
      email: session.email,
      password: ' exact password ',
    });
    expect(registrationStage.router.state.location.search).toMatchObject({
      redirect: menuUrl,
      intent: intent?.id,
      registered: true,
    });
    expect(readProtectedActionIntent()).toEqual(intent);

    cleanup();
    const login = mockServiceSuccess(authService, 'login', session);
    const loginStage = renderWithCustomerProviders({
      component: <LoginForm intentId={intent?.id} redirectTo={menuUrl} registrationComplete />,
      routePath: '/login',
      initialEntry: `/login?redirect=${encodeURIComponent(menuUrl)}&intent=${intent?.id}&registered=true`,
      session: null,
      theme: 'light',
    });

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await screen.findByText('Your account is ready')).toBeVisible();
    await loginStage.actor.type(screen.getByLabelText('Email'), session.email);
    await loginStage.actor.type(screen.getByLabelText('Password'), ' exact password ');
    await loginStage.actor.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(loginStage.router.state.location.pathname).toBe(menuUrl));
    expect(login).toHaveBeenCalledWith({ email: session.email, password: ' exact password ', rememberMe: false });
    expect(readProtectedActionIntent()).toEqual(intent);

    cleanup();
    const add = mockServiceSuccess(cartService, 'add', cartWithRestoredDraft);
    const recoveryStage = renderWithCustomerProviders({
      component: <RecoveredItemStage />,
      routePath: menuUrl,
      initialEntry: menuUrl,
      session,
      theme: 'light',
      querySeeds: [[cartKeys.place(placeId), emptyCart]],
    });

    expect(await screen.findByText('Your item draft was restored')).toBeVisible();
    expect(screen.getByLabelText('Item note (optional)')).toHaveValue('No ice');
    expect(screen.getByRole('button', { name: 'Add 2 to cart' })).toBeEnabled();
    expect(add).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(INTENT_STORAGE_KEY)).toBeNull();

    await recoveryStage.actor.click(screen.getByRole('button', { name: 'Add 2 to cart' }));
    expect(await screen.findByText('2 added to cart. 2 items in this cart.')).toBeVisible();
    expect(add).toHaveBeenCalledWith(placeId, { menuItemId, quantity: 2, note: 'No ice' });
    expect(recoveryStage.queryClient.getQueryData(cartKeys.place(placeId))).toEqual(cartWithRestoredDraft);
  }, 10_000);

  it('pairs terminal 401 recovery with private-state cleanup and a safe return URL', async () => {
    mockServiceFailure(
      ordersService,
      'list',
      applicationError({
        error: true,
        message: 'Session expired',
        code: 'UNAUTHORIZED',
        httpStatus: 401,
        isNetworkError: false,
      }),
    );
    const currentUrl = '/orders?status=READY';
    const rendered = renderWithCustomerProviders({
      component: (
        <CustomerOrdersPage
          filters={{ page: 1, limit: 20, status: 'READY' }}
          currentUrl={currentUrl}
          onFiltersChange={() => undefined}
        />
      ),
      routePath: '/orders',
      initialEntry: currentUrl,
      session,
      theme: 'light',
    });
    rendered.queryClient.setQueryData(['private-customer-data'], { orderId: 'private-order' });
    sessionStorage.setItem(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${session.userId}.${placeId}`, '{}');

    expect(await screen.findByText('Sign in required')).toBeVisible();
    const recoveryLink = screen.getByRole('link', { name: 'Sign in again' }) as HTMLAnchorElement;
    expect(new URL(recoveryLink.href).pathname).toBe('/login');
    expect(new URL(recoveryLink.href).searchParams.get('redirect')).toBe(currentUrl);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: api.getStorageTokenKeyName(),
        oldValue: 'expired-token',
        newValue: null,
      }),
    );

    await waitFor(() => expect(rendered.queryClient.getQueryData(['auth', 'session'])).toBeNull());
    expect(rendered.queryClient.getQueryData(['private-customer-data'])).toBeUndefined();
    expect(sessionStorage.getItem(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${session.userId}.${placeId}`)).toBeNull();
  });
});
