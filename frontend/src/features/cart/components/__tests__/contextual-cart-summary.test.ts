import { describe, expect, it } from 'vitest';

import type { Cart } from '../../types/cart.type';
import { getContextualCartQuantity } from '../contextual-cart-summary';

const placeA = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const placeB = '123e4567-e89b-42d3-a456-426614174000';

const cart: Cart = {
  cartId: '01954b22-ec4e-7aa4-8cb7-91e30b718f30',
  placeId: placeA,
  distinctItemCount: 2,
  aggregateQuantity: 4,
  items: [],
  removedItems: [],
};

describe('contextual cart summary', () => {
  it('uses the confirmed quantity only for the matching place', () => {
    expect(getContextualCartQuantity(cart, placeA)).toBe(4);
    expect(getContextualCartQuantity(cart, placeB)).toBe(0);
    expect(getContextualCartQuantity(undefined, placeA)).toBe(0);
  });
});
