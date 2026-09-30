// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';

import { ordersService } from '../../services/orders.service';
import type { OrderDetail } from '../../types/order.type';
import { CustomerOrderDetailPage } from '../customer-order-detail-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: unknown;
    search?: unknown;
    replace?: boolean;
  }) => {
    const { params, search, replace, ...anchorProps } = props;
    void params;
    void search;
    void replace;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
}));

const order: OrderDetail = {
  orderId: '123e4567-e89b-42d3-a456-426614174000',
  orderCode: 'TNG-20260929-ABCDEFGH',
  source: 'CUSTOMER',
  createdBy: null,
  place: { placeId: '123e4567-e89b-42d3-a456-426614174001', name: 'Warung Kita' },
  status: 'PENDING',
  fulfillmentType: 'DINE_IN',
  customerName: 'Ayu',
  diningTableName: 'Patio 4',
  subtotal: 50_000,
  createdAt: '2026-09-29T05:00:00.000Z',
  statusUpdatedAt: '2026-09-29T05:01:00.000Z',
  expiresAt: '2026-09-29T05:15:00.000Z',
  customerNote: 'No cutlery',
  cancellationReason: null,
  diningTable: { tableId: '123e4567-e89b-42d3-a456-426614174002', name: 'Patio 4' },
  confirmedAt: null,
  completedAt: null,
  cancelledAt: null,
  items: [
    {
      menuItemId: '123e4567-e89b-42d3-a456-426614174003',
      itemName: 'Nasi Goreng Snapshot',
      itemType: 'FOOD',
      unitPrice: 25_000,
      quantity: 2,
      note: 'Extra spicy',
      lineTotal: 50_000,
    },
  ],
};

const renderPage = (placed: boolean) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerOrderDetailPage orderId={order.orderId} placed={placed} placeSlug='warung-kita' />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('customer order detail page', () => {
  it('loads authoritative owned detail for a reload-safe placed presentation', async () => {
    const getOwn = vi.spyOn(ordersService, 'getOwn').mockResolvedValue(order);
    renderPage(true);

    expect(await screen.findByText('Order received')).toBeTruthy();
    expect(getOwn).toHaveBeenCalledWith(order.orderId);
    const code = screen.getByText(order.orderCode);
    expect(code.className).toContain('select-all');
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Patio 4')).toBeTruthy();
    expect(screen.getByText('Nasi Goreng Snapshot')).toBeTruthy();
    expect(screen.getByText(/2 ×/)).toBeTruthy();
    expect(screen.getAllByText(/Rp\s*50\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pending orders expire/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View order details' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'My orders' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Return to menu' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/verification|payment|qr code/i);
  });

  it('uses a neutral direct-access presentation without a checkout announcement', async () => {
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue(order);
    renderPage(false);

    expect(await screen.findByText(order.orderCode)).toBeTruthy();
    expect(screen.queryByText('Order received')).toBeNull();
    expect(screen.getByText('Your order')).toBeTruthy();
  });

  it('shows a neutral ownership error without exposing another order', async () => {
    vi.spyOn(ordersService, 'getOwn').mockRejectedValue({
      error: true,
      message: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      httpStatus: 404,
      isNetworkError: false,
    });
    renderPage(false);

    expect(await screen.findByRole('link', { name: 'Return to My orders' })).toBeTruthy();
    expect(screen.queryByText(order.orderCode)).toBeNull();
  });
});
