// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reviewsService } from '@/features/reviews/services/reviews.service';

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

  it('never offers cancellation for terminal orders and exposes verified-purchase review actions', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });
    vi.spyOn(reviewsService, 'listOwnMenuItemReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue({
      ...order,
      status: 'COMPLETED',
      completedAt: '2026-09-29T05:30:00.000Z',
    });
    renderPage(false);

    expect(await screen.findByText('Review this order')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review Warung Kita' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review Nasi Goreng Snapshot' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancel order' })).toBeNull();
  });

  it('submits exact completed-order review context and announces a restored review', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });
    vi.spyOn(reviewsService, 'listOwnMenuItemReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });
    const completed = { ...order, status: 'COMPLETED' as const, completedAt: '2026-09-29T05:30:00.000Z' };
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue(completed);
    const create = vi.spyOn(reviewsService, 'createPlaceReview').mockResolvedValue({
      outcome: 'restored',
      review: {
        reviewId: 'review-1',
        rating: 5,
        comment: 'Excellent',
        reviewer: { userId: 'user-1', fullName: 'Ayu' },
        createdAt: '2026-09-29T06:00:00.000Z',
        updatedAt: '2026-09-29T06:00:00.000Z',
      },
    });
    renderPage(false);

    await userEvent.click(await screen.findByRole('button', { name: 'Review Warung Kita' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: '5 out of 5 stars' }));
    await userEvent.type(within(dialog).getByLabelText('Comment (optional)'), 'Excellent');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit review' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(order.place.placeId, {
        orderId: order.orderId,
        rating: 5,
        comment: 'Excellent',
      }),
    );
    expect(await screen.findByText(/restored and updated/i)).toBeTruthy();
  });

  it('deduplicates item actions and preserves the draft on an authoritative duplicate conflict', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 101, totalPages: 2 },
    });
    vi.spyOn(reviewsService, 'listOwnMenuItemReviews').mockResolvedValue({
      reviews: [],
      meta: { page: 1, limit: 100, totalItems: 101, totalPages: 2 },
    });
    const completed = {
      ...order,
      status: 'COMPLETED' as const,
      completedAt: '2026-09-29T05:30:00.000Z',
      items: [order.items[0], { ...order.items[0], note: 'No spice' }],
    };
    vi.spyOn(ordersService, 'getOwn').mockResolvedValue(completed);
    const create = vi.spyOn(reviewsService, 'createMenuItemReview').mockRejectedValue({
      error: true,
      message: 'Internal duplicate detail',
      code: 'REVIEW_ALREADY_EXISTS',
      httpStatus: 409,
      isNetworkError: false,
    });
    renderPage(false);

    const itemActions = await screen.findAllByRole('button', { name: 'Review Nasi Goreng Snapshot' });
    expect(itemActions).toHaveLength(1);
    await userEvent.click(itemActions[0]);
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: '4 out of 5 stars' }));
    const comment = within(dialog).getByLabelText('Comment (optional)');
    await userEvent.type(comment, 'Keep this draft');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit review' }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(order.place.placeId, order.items[0].menuItemId, {
        orderId: order.orderId,
        rating: 4,
        comment: 'Keep this draft',
      }),
    );
    expect(await within(dialog).findByText('Review already submitted')).toBeTruthy();
    expect((comment as HTMLTextAreaElement).value).toBe('Keep this draft');
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
