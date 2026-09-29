// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { cartService } from '@/features/cart/services/cart.service';
import type { Cart } from '@/features/cart/types/cart.type';
import { placesService } from '@/features/places/services/places.service';

import { AuthContext, type AuthContextType } from '@/utils/context/auth-context';

import { PlatformRole } from '@/types/enums/user-role.enum';

import { ordersService } from '../../services/orders.service';
import type { CheckoutOrder } from '../../types/order.type';
import { CheckoutPage } from '../checkout-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; params?: unknown }) => {
    const { params, ...anchorProps } = props;
    void params;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';
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
  isOrderingEnabled: true,
  createdAt: '',
  updatedAt: '',
  logoUrl: null,
  coverUrl: null,
  businessHours: [],
  isOpen: true,
};
const cart: Cart = {
  cartId: '8f95e179-a74f-46e0-aea8-e796a297c667',
  placeId,
  distinctItemCount: 1,
  aggregateQuantity: 2,
  items: [
    {
      menuItemId,
      name: 'Iced tea',
      type: 'DRINK',
      category: { categoryId: '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8', name: 'Cold drinks' },
      unitPrice: 12_500,
      quantity: 2,
      note: 'No ice',
    },
  ],
  removedItems: [],
};
const order: CheckoutOrder = {
  orderId: 'f9f78164-06bf-46e0-9574-dc1a2db937ef',
  orderCode: 'TNG-20260929-ABCDEFGH',
  placeId,
  status: 'PENDING',
  fulfillmentType: 'TAKEAWAY',
  customerName: 'Dian Erdiana',
  customerNote: null,
  diningTable: null,
  items: [],
  subtotal: 25_000,
  createdAt: '2026-09-29T00:00:00.000Z',
  statusUpdatedAt: '2026-09-29T00:00:00.000Z',
  expiresAt: '2026-09-29T00:15:00.000Z',
};
const auth = {
  isAuthenticated: true,
  isInitialLoading: false,
  user: {
    userId: '68d7c23d-ef58-43b0-8658-f4f2d5ed8e74',
    fullName: 'Dian Erdiana',
    email: 'dian@example.com',
    platformRole: PlatformRole.USER,
    permissions: [],
    globalPermissions: [],
    placeMemberships: [],
    createdAt: '',
    updatedAt: '',
  },
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
} satisfies AuthContextType;

const renderCheckout = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <CheckoutPage slug='warung-kita' />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return client;
};

beforeEach(() => {
  vi.spyOn(placesService, 'getPublic').mockResolvedValue(place);
  vi.spyOn(cartService, 'get').mockResolvedValue(cart);
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'checkout-attempt-1') });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('customer checkout page', () => {
  it('renders the current review and a visibly gated DINE_IN option without fetching management tables', async () => {
    renderCheckout();

    expect(await screen.findByRole('heading', { name: 'Warung Kita' })).toBeTruthy();
    expect(screen.getByText('Iced tea')).toBeTruthy();
    expect(screen.getByText(/Rp\s*12\.500 each/)).toBeTruthy();
    expect((screen.getByRole('radio', { name: /^Takeaway/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: /^Dine in/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Table selection is not available for customer checkout yet.')).toBeTruthy();
    expect(screen.getByText(/does not provide an authoritative subtotal/i)).toBeTruthy();
  });

  it('submits the exact TAKEAWAY payload once and renders confirmed success', async () => {
    let resolveCheckout: (value: CheckoutOrder) => void = () => undefined;
    const checkout = vi.spyOn(ordersService, 'checkout').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCheckout = resolve;
        }),
    );
    renderCheckout();
    await screen.findByRole('heading', { name: 'Warung Kita' });
    const form = screen.getAllByRole('button', { name: 'Place takeaway order' })[0].closest('form')!;

    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    expect(checkout).toHaveBeenCalledWith(
      {
        placeId,
        fulfillmentType: 'TAKEAWAY',
        customerName: 'Dian Erdiana',
        customerNote: null,
      },
      'checkout-attempt-1',
    );

    resolveCheckout(order);
    expect(await screen.findByText('TNG-20260929-ABCDEFGH')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View order' })).toBeTruthy();
  });

  it('retains safe inputs and blocks blind resubmission after an uncertain outcome', async () => {
    vi.spyOn(ordersService, 'checkout').mockRejectedValue({
      error: true,
      message: 'Socket closed',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    });
    renderCheckout();
    const note = (await screen.findByLabelText('Order note (optional)')) as HTMLTextAreaElement;
    await userEvent.type(note, 'Please pack separately');
    fireEvent.submit(note.closest('form')!);

    expect(await screen.findByText('Order status is uncertain')).toBeTruthy();
    expect(note.value).toBe('Please pack separately');
    expect(screen.getByRole('link', { name: 'Check My orders' })).toBeTruthy();
    screen
      .getAllByRole('button', { name: 'Place takeaway order' })
      .forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));
  });

  it('associates validation feedback and focuses the first invalid field', async () => {
    const checkout = vi.spyOn(ordersService, 'checkout');
    renderCheckout();
    const name = (await screen.findByLabelText('Customer name')) as HTMLInputElement;
    await userEvent.clear(name);
    fireEvent.submit(name.closest('form')!);

    expect(await screen.findByText('Enter a customer name')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(checkout).not.toHaveBeenCalled();
    expect(screen.getByText(`0/${100}`)).toBeTruthy();
  });

  it('blocks known availability failures and handles an empty cart without a submit action', async () => {
    vi.mocked(placesService.getPublic).mockResolvedValueOnce({ ...place, isOpen: false, isOrderingEnabled: false });
    renderCheckout();
    await screen.findByText('This place is closed');
    expect(screen.getByText('Online ordering is unavailable')).toBeTruthy();
    screen
      .getAllByRole('button', { name: 'Place takeaway order' })
      .forEach((button) => expect((button as HTMLButtonElement).disabled).toBe(true));

    cleanup();
    vi.mocked(placesService.getPublic).mockResolvedValueOnce(place);
    vi.mocked(cartService.get).mockResolvedValueOnce({
      ...cart,
      cartId: null,
      distinctItemCount: 0,
      aggregateQuantity: 0,
      items: [],
    });
    renderCheckout();
    expect(await screen.findByText('Your cart is empty')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Place takeaway order' })).toBeNull();
  });
});
