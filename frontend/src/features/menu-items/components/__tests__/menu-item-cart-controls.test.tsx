// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { useQuery } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { cartKeys, cartQueryOptions } from '@/features/cart/queries/cart.query';
import { cartService } from '@/features/cart/services/cart.service';
import type { Cart } from '@/features/cart/types/cart.type';

import { MenuItemCartControls } from '../menu-item-cart-controls';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';
const categoryId = '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8';

const emptyCart: Cart = {
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
};

const cartWithQuantity = (quantity: number): Cart => ({
  cartId: '8f95e179-a74f-46e0-aea8-e796a297c667',
  placeId,
  distinctItemCount: 1,
  aggregateQuantity: quantity,
  items: [
    {
      menuItemId,
      name: 'Iced tea',
      type: 'DRINK',
      category: { categoryId, name: 'Cold drinks' },
      unitPrice: 12_500,
      quantity,
      note: null,
    },
  ],
  removedItems: [],
});

function Harness({ copies = 1 }: { copies?: number }) {
  const query = useQuery(cartQueryOptions(placeId, false));
  return Array.from({ length: copies }, (_, index) => (
    <MenuItemCartControls
      key={index}
      cart={query.data}
      cartReady
      isAuthenticated
      menuItemId={menuItemId}
      placeId={placeId}
      placeSlug='warung-kita'
      returnTo='/places/warung-kita/menu'
    />
  ));
}

const renderHarness = (cart: Cart, copies = 1) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(cartKeys.place(placeId), cart);
  render(
    <QueryClientProvider client={client}>
      <Harness copies={copies} />
    </QueryClientProvider>,
  );
  return client;
};

describe('menu item cart controls', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('replaces every matching control with the confirmed server quantity', async () => {
    let resolveAdd!: (cart: Cart) => void;
    vi.spyOn(cartService, 'add').mockReturnValueOnce(new Promise((resolve) => (resolveAdd = resolve)));
    renderHarness(emptyCart, 2);

    const addButtons = screen.getAllByRole('button', { name: 'Add to cart' });
    await userEvent.click(addButtons[0]);
    await waitFor(() => expect((addButtons[0] as HTMLButtonElement).disabled).toBe(true));
    await waitFor(() => expect((addButtons[1] as HTMLButtonElement).disabled).toBe(true));

    resolveAdd(cartWithQuantity(1));

    await waitFor(() => expect(screen.getAllByText('1')).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
    expect(
      (screen.getAllByRole('button', { name: 'Decrease iced tea quantity' })[0] as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('keeps the confirmed value and explains a concurrent failure', async () => {
    vi.spyOn(cartService, 'update').mockRejectedValueOnce({
      error: true,
      message: 'Cart changed concurrently',
      code: 'CART_CONCURRENT_MODIFICATION',
      httpStatus: 409,
      isNetworkError: false,
    });
    const client = renderHarness(cartWithQuantity(2));

    await userEvent.click(screen.getByRole('button', { name: 'Increase iced tea quantity' }));

    await screen.findByText('Cart changed');
    expect(screen.getByText('2')).toBeTruthy();
    expect(client.getQueryState(cartKeys.place(placeId))?.isInvalidated).toBe(true);
  });

  it('uses complete server carts for increment and decrement without contaminating another place', async () => {
    const otherPlaceId = '42219512-b86b-4b05-8816-f8ee7f52fc65';
    const otherCart: Cart = {
      ...emptyCart,
      placeId: otherPlaceId,
    };
    const update = vi
      .spyOn(cartService, 'update')
      .mockResolvedValueOnce(cartWithQuantity(3))
      .mockResolvedValueOnce(cartWithQuantity(2));
    const client = renderHarness(cartWithQuantity(2));
    client.setQueryData(cartKeys.place(otherPlaceId), otherCart);

    await userEvent.click(screen.getByRole('button', { name: /increase iced tea quantity/i }));
    await waitFor(() => expect(screen.getByText('3')).toBeVisible());
    expect(update).toHaveBeenNthCalledWith(1, placeId, menuItemId, { quantity: 3 });

    await userEvent.click(screen.getByRole('button', { name: /decrease iced tea quantity/i }));
    await waitFor(() => expect(screen.getByText('2')).toBeVisible());
    expect(update).toHaveBeenNthCalledWith(2, placeId, menuItemId, { quantity: 2 });
    expect(client.getQueryData(cartKeys.place(otherPlaceId))).toEqual(otherCart);
  });

  it('keeps the confirmed empty cart and exposes an unavailable-item failure', async () => {
    vi.spyOn(cartService, 'add').mockRejectedValueOnce({
      error: true,
      message: 'Menu item is unavailable',
      code: 'MENU_ITEM_UNAVAILABLE',
      httpStatus: 409,
      isNetworkError: false,
    });
    const client = renderHarness(emptyCart);

    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByText('Item unavailable')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
    expect(client.getQueryData(cartKeys.place(placeId))).toEqual(emptyCart);
  });
});
