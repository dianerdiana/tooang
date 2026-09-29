// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { cartService } from '@/features/cart/services/cart.service';

vi.mock('@/features/reviews/components/public-menu-item-reviews', () => ({
  PublicMenuItemReviews: () => <div>Reviews</div>,
}));

import { PublicMenuItemDetail } from '../public-menu-item-detail';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';

describe('public menu item cart draft recovery', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens the matching draft after login without submitting it automatically', async () => {
    const add = vi.spyOn(cartService, 'add');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PublicMenuItemDetail
          cartReady
          isAuthenticated
          placeId={placeId}
          placeSlug='warung-kita'
          item={{
            menuItemId,
            categoryId: '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8',
            categoryName: 'Cold drinks',
            name: 'Iced tea',
            description: null,
            type: 'DRINK',
            price: 12_500,
            isAvailable: true,
            sortOrder: 1,
            imageUrl: null,
          }}
          orderingEnabled
          returnTo='/places/warung-kita/menu'
          restoredIntent={{
            version: 1,
            id: '92f3f96b-c1ee-4d74-97cb-e0230767276b',
            kind: 'add-to-cart',
            payload: { placeId, placeSlug: 'warung-kita', menuItemId, quantity: 2, note: 'Less ice' },
            returnTo: '/places/warung-kita/menu',
            createdAt: 1,
            expiresAt: 900_001,
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect((screen.getByLabelText('Item note (optional)') as HTMLTextAreaElement).value).toBe('Less ice'),
    );
    expect(screen.getByRole('button', { name: 'Add 2 to cart' })).toBeTruthy();
    expect(add).not.toHaveBeenCalled();
  });
});
