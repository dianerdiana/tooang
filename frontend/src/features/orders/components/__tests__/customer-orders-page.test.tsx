// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';

import type { NormalizedCustomerOrderSearch } from '../../schemas/customer-order-list.schema';
import { ordersService } from '../../services/orders.service';
import type { OrderSummary } from '../../types/order.type';
import { CustomerOrdersPage } from '../customer-orders-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    state,
    search,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: { orderId?: string };
    state?: unknown;
    search?: unknown;
  }) => {
    void state;
    void search;
    return (
      <a href={params?.orderId ? to.replace('$orderId', params.orderId) : to} {...props}>
        {children}
      </a>
    );
  },
}));

const activeOrder: OrderSummary = {
  orderId: '123e4567-e89b-42d3-a456-426614174000',
  orderCode: 'TNG-20260929-UNTRUNCATED',
  source: 'CUSTOMER',
  createdBy: null,
  place: { placeId: '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae', name: 'Warung Kita' },
  status: 'READY',
  fulfillmentType: 'DINE_IN',
  customerName: 'Ayu',
  diningTableName: 'Patio 4',
  subtotal: 50_000,
  createdAt: '2026-09-29T05:00:00.000Z',
  statusUpdatedAt: '2026-09-29T05:01:00.000Z',
  expiresAt: '2026-09-29T05:15:00.000Z',
};

const terminalOrder: OrderSummary = {
  ...activeOrder,
  orderId: '123e4567-e89b-42d3-a456-426614174099',
  orderCode: 'TNG-20260928-PASTORDER',
  place: { placeId: '123e4567-e89b-42d3-a456-426614174088', name: 'Kopi Senja' },
  status: 'COMPLETED',
  fulfillmentType: 'TAKEAWAY',
  diningTableName: null,
};

const renderPage = (filters: NormalizedCustomerOrderSearch = { page: 1, limit: 20 }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onFiltersChange = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <CustomerOrdersPage filters={filters} currentUrl='/orders' onFiltersChange={onFiltersChange} />
    </QueryClientProvider>,
  );
  return { client, onFiltersChange };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('customer orders page', () => {
  it('renders customer cards in server order with safe snapshot fields', async () => {
    vi.spyOn(ordersService, 'list').mockResolvedValue({
      orders: [activeOrder, terminalOrder],
      meta: { page: 1, limit: 20, totalItems: 2, totalPages: 1 },
    });
    renderPage();

    expect(await screen.findByText(activeOrder.orderCode)).toBeTruthy();
    expect(screen.getByText(terminalOrder.orderCode)).toBeTruthy();
    expect(screen.getByText('Warung Kita')).toBeTruthy();
    expect(screen.getByText('Dine in · Patio 4')).toBeTruthy();
    expect(screen.getAllByText('Takeaway').length).toBeGreaterThan(0);
    expect(screen.getByText('Active order')).toBeTruthy();
    expect(screen.getByText('Past order')).toBeTruthy();
    expect(screen.getAllByText(/Rp\s*50\.000/).length).toBe(2);
    expect(screen.getAllByLabelText(/Order status:/)).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/verification|payment|transition|customer name/i);

    const codes = screen.getAllByRole('link').filter((link) => link.textContent?.startsWith('TNG-'));
    expect(codes.map((link) => link.textContent)).toEqual([activeOrder.orderCode, terminalOrder.orderCode]);
    expect(codes[0]?.className).toContain('break-all');
  });

  it('distinguishes filtered no-results from first-use empty history', async () => {
    vi.spyOn(ordersService, 'list').mockResolvedValue({
      orders: [],
      meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
    const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
    const { onFiltersChange } = renderPage({ page: 1, limit: 20, status: 'EXPIRED' as const, placeId });

    expect(await screen.findByText('No matching orders')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeTruthy();
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it('offers terminal 401 recovery with the current list URL', async () => {
    vi.spyOn(ordersService, 'list').mockRejectedValue({
      error: true,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
      httpStatus: 401,
      isNetworkError: false,
    });
    renderPage();

    expect(await screen.findByText('Sign in required')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in again' })).toBeTruthy();
    expect(screen.queryByText('No orders yet')).toBeNull();
  });
});
