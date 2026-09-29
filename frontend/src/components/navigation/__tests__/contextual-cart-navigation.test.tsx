// @vitest-environment jsdom

import type { PropsWithChildren } from 'react';

import { describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { cartKeys } from '@/features/cart/queries/cart.query';
import { cartService } from '@/features/cart/services/cart.service';
import type { Cart } from '@/features/cart/types/cart.type';

import { useContextualCartCount } from '../customer-navigation';

const placeA = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const placeB = '8f95e179-a74f-46e0-aea8-e796a297c667';

const cart = (placeId: string, quantity: number): Cart => ({
  cartId: null,
  placeId,
  distinctItemCount: quantity > 0 ? 1 : 0,
  aggregateQuantity: quantity,
  items: [],
  removedItems: [],
});

describe('contextual cart navigation', () => {
  it('drops the previous badge while a new place loads and preserves both cached carts', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const cartA = cart(placeA, 4);
    const cartB = cart(placeB, 2);
    client.setQueryData(cartKeys.place(placeA), cartA);
    vi.spyOn(cartService, 'get').mockImplementation(() => new Promise(() => undefined));
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(({ placeId }) => useContextualCartCount(placeId), {
      initialProps: { placeId: placeA },
      wrapper,
    });

    expect(result.current).toBe(4);
    rerender({ placeId: placeB });
    expect(result.current).toBeUndefined();

    client.setQueryData(cartKeys.place(placeB), cartB);
    await waitFor(() => expect(result.current).toBe(2));
    rerender({ placeId: placeA });
    expect(result.current).toBe(4);
    expect(client.getQueryData(cartKeys.place(placeA))).toBe(cartA);
    expect(client.getQueryData(cartKeys.place(placeB))).toBe(cartB);
  });
});
