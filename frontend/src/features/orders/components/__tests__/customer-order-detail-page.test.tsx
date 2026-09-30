// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ordersService } from '../../services/orders.service';
import type { OrderDetail } from '../../types/order.type';
import { CustomerOrderDetailPage } from '../customer-order-detail-page';

const routerMocks = vi.hoisted(() => ({ back: vi.fn(), navigate: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    history: { back: routerMocks.back },
    navigate: routerMocks.navigate,
  }),
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
  expiresAt: '2099-09-29T05:15:00.000Z',
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

const renderPage = (placed: boolean, fromCustomerOrders = false) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerOrderDetailPage
        orderId={order.orderId}
        placed={placed}
        placeSlug='warung-kita'
        fromCustomerOrders={fromCustomerOrders}
      />
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
    expect(screen.getByRole('button', { name: 'My orders' })).toBeTruthy();
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

  it('uses history when returning to a marked customer order list', async () => {
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue(order);
    renderPage(false, true);

    await userEvent.click(await screen.findByRole('button', { name: 'My orders' }));
    expect(routerMocks.back).toHaveBeenCalledOnce();
    expect(routerMocks.navigate).not.toHaveBeenCalled();
  });

  it('cancels an eligible pending order with an optional reason and refreshes authoritative detail', async () => {
    const cancelled = {
      ...order,
      status: 'CANCELLED' as const,
      cancellationReason: 'Changed plans',
      cancelledAt: '2026-09-29T05:05:00.000Z',
    };
    vi.spyOn(ordersService, 'getOwn').mockResolvedValueOnce(order).mockResolvedValue(cancelled);
    const transition = vi.spyOn(ordersService, 'transitionOwn').mockResolvedValue(cancelled);
    renderPage(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.type(within(dialog).getByLabelText('Reason (optional)'), 'Changed plans');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    await waitFor(() => expect(transition).toHaveBeenCalledWith(order.orderId, 'Changed plans'));
    expect(await screen.findByLabelText('Order status: Cancelled')).toBeTruthy();
    expect(screen.getByText('Changed plans')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('hides cancellation and refreshes when a displayed pending order is already expired', async () => {
    const expiredPending = { ...order, expiresAt: '2020-09-29T05:15:00.000Z' };
    const getOwn = vi.spyOn(ordersService, 'getOwn').mockResolvedValue(expiredPending);
    renderPage(false);

    expect(await screen.findByText('This pending status may be out of date')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
    await waitFor(() => expect(getOwn.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('lets a backend status conflict replace the stale cancellation action', async () => {
    const ready = { ...order, status: 'READY' as const, statusUpdatedAt: '2026-09-29T05:06:00.000Z' };
    vi.spyOn(ordersService, 'getOwn').mockResolvedValueOnce(order).mockResolvedValue(ready);
    vi.spyOn(ordersService, 'transitionOwn').mockRejectedValue({
      error: true,
      message: 'Order status changed',
      code: 'ORDER_STATUS_CHANGED',
      httpStatus: 409,
      isNetworkError: false,
    });
    renderPage(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await screen.findByText('Order status changed')).toBeTruthy();
    expect(await screen.findByLabelText('Order status: Ready')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('offers sign-in recovery when the session expires during cancellation', async () => {
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue(order);
    vi.spyOn(ordersService, 'transitionOwn').mockRejectedValue({
      error: true,
      message: 'Session expired',
      code: 'UNAUTHORIZED',
      httpStatus: 401,
      isNetworkError: false,
    });
    renderPage(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await within(dialog).findByText('Sign in required')).toBeTruthy();
    expect(within(dialog).getByRole('link', { name: 'Sign in again' }).getAttribute('href')).toBe('/login');
  });

  it('replaces a hidden cancellation 404 with the neutral owned-order error', async () => {
    const hiddenNotFound = {
      error: true,
      message: 'Order not found',
      code: 'ORDER_NOT_FOUND',
      httpStatus: 404,
      isNetworkError: false,
    };
    vi.spyOn(ordersService, 'getOwn').mockResolvedValueOnce(order).mockRejectedValue(hiddenNotFound);
    vi.spyOn(ordersService, 'transitionOwn').mockRejectedValue(hiddenNotFound);
    renderPage(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await screen.findByRole('button', { name: 'Return to My orders' })).toBeTruthy();
    expect(screen.queryByText(order.orderCode)).toBeNull();
  });

  it('never offers cancellation for terminal orders and surfaces the completed-review placeholder', async () => {
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue({
      ...order,
      status: 'COMPLETED',
      completedAt: '2026-09-29T05:30:00.000Z',
    });
    renderPage(false);

    expect(await screen.findByText('Review this order')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reviews coming soon' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
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

    expect(await screen.findByRole('button', { name: 'Return to My orders' })).toBeTruthy();
    expect(screen.queryByText(order.orderCode)).toBeNull();
  });
});
