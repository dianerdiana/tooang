import { describe, expect, it } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { publicMenuKeys } from '@/features/menu-items/queries/menu-items.query';

import { invalidateCartAfterMutationError, replaceCartCache } from '../cart.mutation';
import { cartKeys, cartQueryOptions } from '../cart.query';

const placeA = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const placeB = '8f95e179-a74f-46e0-aea8-e796a297c667';
const cart = (placeId: string, quantity = 0) => ({
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: quantity,
  items: [],
  removedItems: [],
});

describe('cart query cache', () => {
  it('creates only place-isolated keys and options', () => {
    expect(cartKeys.place(placeA)).toEqual(['cart', 'place', placeA]);
    expect(cartKeys.place(placeA)).not.toEqual(cartKeys.place(placeB));
    expect(cartQueryOptions(placeA, false)).toMatchObject({ queryKey: cartKeys.place(placeA), enabled: false });
  });

  it('replaces only the requested place with the complete server response', () => {
    const client = new QueryClient();
    const other = cart(placeB);
    client.setQueryData(cartKeys.place(placeB), other);
    replaceCartCache(client, placeA, cart(placeA));
    expect(client.getQueryData(cartKeys.place(placeA))).toEqual(cart(placeA));
    expect(client.getQueryData(cartKeys.place(placeB))).toBe(other);
    expect(() => replaceCartCache(client, placeA, cart(placeB))).toThrow(/requested place/);
  });

  it('invalidates only the failed place and refreshes its menu for unavailable/404 failures', async () => {
    const client = new QueryClient();
    client.setQueryData(cartKeys.place(placeA), cart(placeA));
    client.setQueryData(cartKeys.place(placeB), cart(placeB));
    client.setQueryData(publicMenuKeys.place(placeA), {});

    await invalidateCartAfterMutationError(client, placeA, {
      error: true,
      message: 'Unavailable',
      code: 'MENU_ITEM_UNAVAILABLE',
      httpStatus: 409,
      isNetworkError: false,
    });

    expect(client.getQueryState(cartKeys.place(placeA))?.isInvalidated).toBe(true);
    expect(client.getQueryState(cartKeys.place(placeB))?.isInvalidated).toBe(false);
    expect(client.getQueryState(publicMenuKeys.place(placeA))?.isInvalidated).toBe(true);
  });
});
