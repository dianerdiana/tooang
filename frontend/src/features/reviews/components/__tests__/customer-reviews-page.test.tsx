// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reviewsService } from '../../services/reviews.service';
import { CustomerReviewsPage } from '../customer-reviews-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const placeReview = {
  reviewId: 'review-1',
  rating: 4,
  comment: 'Very good',
  place: { placeId: '123e4567-e89b-42d3-a456-426614174001', name: 'Warung Kita' },
  order: { orderId: '123e4567-e89b-42d3-a456-426614174000', orderCode: 'TNG-001' },
  createdAt: '2026-09-29T05:00:00.000Z',
  updatedAt: '2026-09-29T05:00:00.000Z',
};

function renderPage(onSearchChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerReviewsPage search={{ tab: 'place', page: 1, limit: 20 }} onSearchChange={onSearchChange} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('customer reviews page', () => {
  it('renders customer cards and keeps tab state URL-driven', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [placeReview],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
    const onSearchChange = vi.fn();
    renderPage(onSearchChange);

    expect(await screen.findByRole('heading', { name: 'Warung Kita', level: 2 })).toBeTruthy();
    expect(screen.getByText('Order TNG-001')).toBeTruthy();
    expect(screen.getByLabelText('4 out of 5 stars')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Menu items' }));
    expect(onSearchChange).toHaveBeenCalledWith({ tab: 'menu-item', page: 1, limit: 20 });
  });

  it('edits through the shared star form with exact public cache context', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [placeReview],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
    const update = vi.spyOn(reviewsService, 'updateOwnReview').mockResolvedValue({});
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('radio', { name: '5 out of 5 stars' }));
    const comment = within(dialog).getByLabelText('Comment (optional)');
    await userEvent.clear(comment);
    await userEvent.type(comment, 'Updated feedback');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('place', placeReview.reviewId, {
        rating: 5,
        comment: 'Updated feedback',
      }),
    );
  });

  it('uses a named destructive confirmation without implying order deletion', async () => {
    vi.spyOn(reviewsService, 'listOwnPlaceReviews').mockResolvedValue({
      reviews: [placeReview],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });
    vi.spyOn(reviewsService, 'deleteOwnReview').mockResolvedValue({});
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete review for Warung Kita?')).toBeTruthy();
    expect(within(dialog).getByText(/order history and purchase record will not be removed/i)).toBeTruthy();
  });
});
