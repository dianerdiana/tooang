import { describe, expect, it } from 'vitest';

import { addCartItemSchema, cartNoteSchema, cartSchema, normalizeCartNote, updateCartItemSchema } from '../cart.schema';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const cartId = '8f95e179-a74f-46e0-aea8-e796a297c667';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';
const categoryId = '7ba2ba71-0e8b-45b5-9ed0-36c866c531a8';

const item = {
  menuItemId,
  name: 'Iced tea',
  type: 'DRINK',
  category: { categoryId, name: 'Cold drinks' },
  unitPrice: 12_500.5,
  quantity: 2,
  note: 'Less ice',
};

describe('cart schemas', () => {
  it('normalizes notes by code point and accepts update zero as explicit removal', () => {
    expect(normalizeCartNote('  Cafe\u0301\r\nless ice  ')).toBe('Café\nless ice');
    expect(normalizeCartNote('   ')).toBeNull();
    expect(cartNoteSchema.safeParse('😀'.repeat(500)).success).toBe(true);
    expect(cartNoteSchema.safeParse('😀'.repeat(501)).success).toBe(false);
    expect(updateCartItemSchema.parse({ quantity: 0 })).toEqual({ quantity: 0 });
  });

  it('enforces exact add/update inputs and quantity boundaries', () => {
    expect(addCartItemSchema.parse({ menuItemId: menuItemId.toUpperCase() })).toEqual({
      menuItemId,
      quantity: 1,
    });
    expect(addCartItemSchema.safeParse({ menuItemId, quantity: 0 }).success).toBe(false);
    expect(addCartItemSchema.safeParse({ menuItemId, quantity: 100 }).success).toBe(false);
    expect(addCartItemSchema.safeParse({ menuItemId, price: 1 }).success).toBe(false);
    expect(updateCartItemSchema.safeParse({}).success).toBe(false);
    expect(updateCartItemSchema.safeParse({ quantity: 1, userId: placeId }).success).toBe(false);
  });

  it('models empty and reconciled carts while stripping gated totals', () => {
    expect(
      cartSchema.parse({
        cartId: null,
        placeId,
        distinctItemCount: 0,
        aggregateQuantity: 0,
        items: [],
        removedItems: [],
        subtotal: 0,
      }),
    ).toEqual({
      cartId: null,
      placeId,
      distinctItemCount: 0,
      aggregateQuantity: 0,
      items: [],
      removedItems: [],
    });

    const parsed = cartSchema.parse({
      cartId,
      placeId,
      distinctItemCount: 1,
      aggregateQuantity: 2,
      items: [{ ...item, lineTotal: 25_001 }],
      removedItems: [
        { menuItemId, reason: 'ITEM_DELETED' },
        { menuItemId, reason: 'ITEM_UNAVAILABLE' },
        { menuItemId, reason: 'CATEGORY_DELETED' },
        { menuItemId, reason: 'CATEGORY_INACTIVE' },
      ],
    });

    expect(parsed.items[0]).toEqual(item);
    expect(parsed.removedItems.map(({ reason }) => reason)).toEqual([
      'ITEM_DELETED',
      'ITEM_UNAVAILABLE',
      'CATEGORY_DELETED',
      'CATEGORY_INACTIVE',
    ]);
    expect(parsed).not.toHaveProperty('subtotal');
    expect(parsed.items[0]).not.toHaveProperty('lineTotal');
  });

  it('rejects inconsistent counts and server-side cart limit violations', () => {
    expect(
      cartSchema.safeParse({
        cartId,
        placeId,
        distinctItemCount: 1,
        aggregateQuantity: 201,
        items: [{ ...item, quantity: 99 }],
        removedItems: [],
      }).success,
    ).toBe(false);
    expect(
      cartSchema.safeParse({
        cartId,
        placeId,
        distinctItemCount: 0,
        aggregateQuantity: 2,
        items: [item],
        removedItems: [],
      }).success,
    ).toBe(false);
  });
});
