// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ordersService } from '../../services/orders.service';
import type { PublicOrderVerification } from '../../types/order.type';
import { PublicOrderVerificationPage } from '../public-order-verification-page';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

const token = `${'A'.repeat(42)}_`;
const verification: PublicOrderVerification = {
  orderCode: 'TNG-20260930-ABCDEFGH',
  placeName: 'Warung Kita',
  status: 'PENDING',
  fulfillmentType: 'DINE_IN',
  createdAt: '2026-09-30T10:00:00.000Z',
  expiresAt: '2026-09-30T10:15:00.000Z',
  statusUpdatedAt: '2026-09-30T10:01:00.000Z',
};

function renderPage(candidate = token) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PublicOrderVerificationPage token={candidate} />
    </QueryClientProvider>,
  );
}

const notFoundError = (message: string) => ({
  error: true as const,
  message,
  code: 'ORDER_VERIFICATION_NOT_FOUND',
  httpStatus: 404,
  isNetworkError: false,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('public order verification page', () => {
  it('renders a geometry-matched initial skeleton', () => {
    vi.spyOn(ordersService, 'getPublicVerification').mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading verification' })).toBeTruthy();
  });

  it('shows only the allowlisted public fields and never exposes the token', async () => {
    vi.spyOn(ordersService, 'getPublicVerification').mockResolvedValue(verification);
    renderPage();

    expect(await screen.findByText(verification.orderCode)).toBeTruthy();
    expect(screen.getByRole('heading', { name: verification.placeName })).toBeTruthy();
    expect(screen.getByLabelText('Order status: Pending')).toBeTruthy();
    expect(screen.getByText('Dine in')).toBeTruthy();
    expect(screen.getByText('Pending expiry')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh status' })).toBeTruthy();
    expect(document.body.textContent).not.toContain(token);
    expect(document.body.textContent).not.toMatch(/customer|table|item|note|total|order id|payment/i);
  });

  it('keeps malformed, unknown, disabled, and retention-expired outcomes indistinguishable', async () => {
    renderPage('malformed');
    expect(screen.getByRole('heading', { name: 'Verification unavailable' })).toBeTruthy();
    const malformedCopy = document.body.textContent;
    cleanup();

    for (const message of ['Unknown value', 'Disabled value', 'Retention expired value']) {
      vi.spyOn(ordersService, 'getPublicVerification').mockRejectedValueOnce(notFoundError(message));
      renderPage();
      expect(await screen.findByRole('heading', { name: 'Verification unavailable' })).toBeTruthy();
      expect(document.body.textContent).toBe(malformedCopy);
      expect(document.body.textContent).not.toContain(message);
      cleanup();
    }
  });

  it('refreshes non-terminal status manually without offering mutations', async () => {
    const getVerification = vi
      .spyOn(ordersService, 'getPublicVerification')
      .mockResolvedValueOnce({ ...verification, status: 'CONFIRMED' })
      .mockResolvedValueOnce({ ...verification, status: 'READY', statusUpdatedAt: '2026-09-30T10:05:00.000Z' });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Refresh status' }));
    expect(await screen.findByLabelText('Order status: Ready')).toBeTruthy();
    expect(getVerification).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /cancel|complete|confirm/i })).toBeNull();
  });

  it.each([
    ['COMPLETED', 'This order is marked completed.'],
    ['CANCELLED', 'This order is marked cancelled.'],
    ['EXPIRED', 'This order expired before confirmation.'],
  ] as const)('renders terminal %s guidance without a refresh action', async (status, message) => {
    vi.spyOn(ordersService, 'getPublicVerification').mockResolvedValue({ ...verification, status });
    renderPage();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText('Original pending expiry')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Refresh status' })).toBeNull();
  });

  it('presents rate limits safely and permits a manual retry', async () => {
    const getVerification = vi
      .spyOn(ordersService, 'getPublicVerification')
      .mockRejectedValueOnce({
        error: true,
        message: 'Internal limiter detail',
        code: 'TOO_MANY_REQUESTS',
        httpStatus: 429,
        isNetworkError: false,
        retryAfterSeconds: 30,
      })
      .mockResolvedValueOnce(verification);
    renderPage();

    expect(await screen.findByText('Too many verification attempts')).toBeTruthy();
    expect(screen.getByText('Wait about 30 seconds before trying again.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(verification.orderCode)).toBeTruthy();
    expect(getVerification).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toContain('Internal limiter detail');
  });

  it('uses safe retry copy for network errors', async () => {
    vi.spyOn(ordersService, 'getPublicVerification').mockRejectedValue({
      error: true,
      message: `Connection failed for ${token}`,
      code: 'ERR_NETWORK',
      isNetworkError: true,
    });
    renderPage();

    expect(await screen.findByText('Connection problem')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(document.body.textContent).not.toContain(token);
    await waitFor(() => expect(document.body.textContent).not.toContain('Connection failed'));
  });
});
