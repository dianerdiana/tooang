// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { cartKeys, cartQueryOptions } from '../../queries/cart.query';
import { cartService } from '../../services/cart.service';
import type { Cart } from '../../types/cart.type';
import {
  CartAvailabilityAlerts,
  CartLineItem,
  CartPageSkeleton,
  CartReconciliationAlert,
  CheckoutAction,
} from '../cart-page';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';

const cartWithItem = (note: string | null = null): Cart => ({
  cartId: '8f95e179-a74f-46e0-aea8-e796a297c667',
  placeId,
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
      note,
    },
  ],
  removedItems: [],
});

const emptyCart: Cart = {
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
};

const place = {
  id: placeId,
  name: 'Warung Kita',
  slug: 'warung-kita',
  type: 'RESTAURANT' as const,
  description: null,
  address: 'Jakarta',
  city: 'Jakarta',
  latitude: null,
  longitude: null,
  phone: null,
  whatsapp: null,
  timezone: 'Asia/Jakarta',
  isPublished: true,
  isOrderingEnabled: false,
  createdAt: '',
  updatedAt: '',
  logoUrl: null,
  coverUrl: null,
  businessHours: [],
  isOpen: false,
};

function CartItemsHarness() {
  const query = useQuery(cartQueryOptions(placeId, false));
  if (!query.data?.items.length) return <p>No cart items</p>;
  return query.data.items.map((item) => (
    <CartLineItem key={`${item.menuItemId}:${item.note ?? ''}`} cart={query.data!} item={item} />
  ));
}

const renderCartItems = (cart: Cart) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(cartKeys.place(placeId), cart);
  render(
    <QueryClientProvider client={client}>
      <CartItemsHarness />
    </QueryClientProvider>,
  );
  return client;
};

describe('cart page presentation', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders stable initial loading geometry', () => {
    const markup = renderToStaticMarkup(<CartPageSkeleton />);
    expect(markup).toContain('aria-label="Loading cart"');
    expect(markup.match(/rounded-surface/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('surfaces every bounded reconciliation reason in a persistent alert', () => {
    const markup = renderToStaticMarkup(
      <CartReconciliationAlert
        removedItems={[
          { menuItemId, reason: 'ITEM_DELETED' },
          { menuItemId, reason: 'ITEM_UNAVAILABLE' },
          { menuItemId, reason: 'CATEGORY_DELETED' },
          { menuItemId, reason: 'CATEGORY_INACTIVE' },
        ]}
      />,
    );
    expect(markup).toContain('Your cart was updated');
    expect(markup).toContain('removed from the menu');
    expect(markup).toContain('no longer available');
    expect(markup).toContain('category was removed');
    expect(markup).toContain('category is currently inactive');
  });

  it('keeps checkout disabled for empty, closed, and ordering-off states without inventing totals', () => {
    const markup = renderToStaticMarkup(
      <>
        <CartAvailabilityAlerts place={place} />
        <CheckoutAction place={place} cart={emptyCart} />
      </>,
    );
    expect(markup).toContain('This place is closed');
    expect(markup).toContain('Online ordering is unavailable');
    expect(markup).toContain('Checkout unavailable');
    expect(markup).toContain('0 items');
    expect(markup).toContain('does not currently return an authoritative total');
    expect(markup).not.toContain('Subtotal');
  });

  it('renders current unit price, note editing, quantity, and an explicit remove action', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <CartLineItem cart={cartWithItem()} item={cartWithItem().items[0]} />
      </QueryClientProvider>,
    );
    expect(markup).toContain('Iced tea');
    expect(markup).toContain('Current unit price');
    expect(markup).toContain('Item note (optional)');
    expect(markup).toContain('Remove');
    expect(markup).not.toContain('lineTotal');
    expect(markup).not.toContain('Subtotal');
  });

  it('uses the complete mutation response for note edits and explicit removal', async () => {
    const updated = cartWithItem('No ice');
    vi.spyOn(cartService, 'update').mockResolvedValueOnce(updated);
    vi.spyOn(cartService, 'remove').mockResolvedValueOnce(emptyCart);
    const client = renderCartItems(cartWithItem());

    await userEvent.type(screen.getByLabelText('Item note (optional)'), 'No ice');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));

    await waitFor(() =>
      expect((screen.getByLabelText('Item note (optional)') as HTMLTextAreaElement).value).toBe('No ice'),
    );
    expect(cartService.update).toHaveBeenCalledWith(placeId, menuItemId, { note: 'No ice' });
    expect(client.getQueryData(cartKeys.place(placeId))).toEqual(updated);

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await screen.findByText('No cart items');
    expect(client.getQueryData(cartKeys.place(placeId))).toEqual(emptyCart);
  });
});
