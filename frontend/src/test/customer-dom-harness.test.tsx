// @vitest-environment jsdom

import { type FormEvent, useState } from 'react';

import { describe, expect, it, vi } from 'vitest';

import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';

import { api } from '@/configs/api-config';

import { cartKeys, cartQueryOptions } from '@/features/cart/queries/cart.query';
import { cartService } from '@/features/cart/services/cart.service';
import type { Cart } from '@/features/cart/types/cart.type';

import { useAppAbility } from '@/utils/hooks/use-app-ability';
import { useAuth } from '@/utils/hooks/use-auth';
import { useTheme } from '@/utils/hooks/use-theme';

import { PlatformRole } from '@/types/enums/user-role.enum';
import { PERMISSION } from '@/types/permission.type';
import type { AuthenticatedUser } from '@/types/user-data.type';

import { renderWithCustomerProviders } from './customer-test-utils';
import { mockServiceSuccess } from './mock-boundaries';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';

const session: AuthenticatedUser = {
  userId: '8f95e179-a74f-46e0-aea8-e796a297c667',
  fullName: 'Harness Customer',
  email: 'harness@example.com',
  platformRole: PlatformRole.USER,
  permissions: [PERMISSION.PROFILE_READ],
  globalPermissions: [],
  placeMemberships: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const emptyCart: Cart = {
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
};

function ProviderProbe() {
  const auth = useAuth();
  const ability = useAppAbility();
  const { theme } = useTheme();
  const cart = useQuery(cartQueryOptions(placeId));
  const [announcement, setAnnouncement] = useState('Ready');

  return (
    <main>
      <h1>Customer harness</h1>
      <p>{auth.user?.fullName}</p>
      <p>{ability.can(PERMISSION.PROFILE_READ, 'Platform') ? 'Profile allowed' : 'Profile denied'}</p>
      <p>Theme: {theme}</p>
      <button type='button' onClick={() => setAnnouncement('Keyboard action completed')}>
        Run action
      </button>
      <p role='status' aria-live='polite'>
        {announcement}
      </p>
      {cart.isPending ? <p>Loading cart</p> : <p>{cart.data?.aggregateQuantity} cart items</p>}
    </main>
  );
}

function MutationProbe() {
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: (nextNote: string) => cartService.update(placeId, menuItemId, { note: nextNote }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(note);
  };

  return (
    <form aria-label='Cart note' onSubmit={submit}>
      <label htmlFor='cart-note'>Item note</label>
      <input id='cart-note' value={note} onChange={(event) => setNote(event.target.value)} />
      <button type='submit'>Save note</button>
      <p role='status' aria-live='polite'>
        {mutation.isPending ? 'Saving note' : mutation.isSuccess ? `Saved ${mutation.data.items[0]?.note}` : 'Ready'}
      </p>
    </form>
  );
}

describe('customer DOM harness', () => {
  let previousClient: QueryClient | undefined;

  it('renders production providers, resolves a service query, and supports keyboard interaction', async () => {
    mockServiceSuccess(cartService, 'get', emptyCart);
    const { actor, router } = renderWithCustomerProviders({
      component: <ProviderProbe />,
      routePath: '/harness',
      initialEntry: '/harness',
      session,
      theme: 'dark',
    });

    expect(await screen.findByRole('heading', { name: 'Customer harness' })).toBeInTheDocument();
    expect(screen.getByText('Harness Customer')).toBeVisible();
    expect(screen.getByText('Profile allowed')).toBeVisible();
    expect(screen.getByText('Theme: dark')).toBeVisible();
    expect(await screen.findByText('0 cart items')).toBeVisible();
    expect(router.state.location.pathname).toBe('/harness');

    await actor.tab();
    expect(screen.getByRole('button', { name: 'Run action' })).toHaveFocus();
    await actor.keyboard('[Enter]');
    expect(screen.getByRole('status')).toHaveTextContent('Keyboard action completed');
    await expect(api.get('/must-not-reach-network')).rejects.toThrow('Unexpected GET request in a DOM test');
  });

  it('supports focus, form input, and async mutation behavior', async () => {
    const updatedCart: Cart = {
      ...emptyCart,
      cartId: 'f086826f-a7d8-4bc7-97ea-568b7037a5db',
      distinctItemCount: 1,
      aggregateQuantity: 1,
      items: [
        {
          menuItemId,
          name: 'Iced tea',
          type: 'DRINK',
          category: { categoryId: '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8', name: 'Cold drinks' },
          unitPrice: 12_500,
          quantity: 1,
          note: 'No ice',
        },
      ],
      removedItems: [],
    };
    const update = mockServiceSuccess(cartService, 'update', updatedCart);
    const { actor } = renderWithCustomerProviders({
      component: <MutationProbe />,
      initialEntry: '/',
      session,
      theme: 'light',
    });

    await actor.tab();
    expect(screen.getByRole('textbox', { name: 'Item note' })).toHaveFocus();
    await actor.keyboard('No ice');
    await actor.tab();
    await actor.keyboard('[Enter]');

    expect(await screen.findByText('Saved No ice')).toBeVisible();
    expect(update).toHaveBeenCalledWith(placeId, menuItemId, { note: 'No ice' });
  });

  it('registers cache, storage, DOM, mocks, and timers for cleanup', async () => {
    const rendered = renderWithCustomerProviders({
      component: <p>Temporary content</p>,
      initialEntry: '/',
      session: null,
      theme: 'light',
    });
    expect(await screen.findByText('Temporary content')).toBeInTheDocument();
    previousClient = rendered.queryClient;
    previousClient.setQueryData(cartKeys.place(placeId), emptyCart);
    localStorage.setItem('temporary-local', 'value');
    sessionStorage.setItem('temporary-session', 'value');
    vi.useFakeTimers();
    setTimeout(() => undefined, 10_000);

    expect(previousClient.getQueryData(cartKeys.place(placeId))).toEqual(emptyCart);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('starts the next test with isolated resources', () => {
    expect(previousClient?.getQueryCache().getAll()).toHaveLength(0);
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    expect(screen.queryByText('Temporary content')).not.toBeInTheDocument();
    expect(vi.isFakeTimers()).toBe(false);
  });
});
