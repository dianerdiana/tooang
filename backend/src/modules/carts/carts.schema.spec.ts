import {
  addCartItemSchema,
  cartItemParamSchema,
  normalizeNote,
  updateCartItemSchema,
} from './carts.schema';

const placeId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
const menuItemId = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB';

describe('cart schemas', () => {
  it('normalizes UUIDs and applies add defaults', () => {
    expect(addCartItemSchema.parse({ menuItemId })).toEqual({
      menuItemId: menuItemId.toLowerCase(),
      quantity: 1,
    });
    expect(cartItemParamSchema.parse({ placeId, menuItemId })).toEqual({
      placeId: placeId.toLowerCase(),
      menuItemId: menuItemId.toLowerCase(),
    });
  });

  it('normalizes notes without changing interior formatting', () => {
    expect(normalizeNote('  Cafe\u0301\r\n  keep  spaces  ')).toBe('Café\n  keep  spaces');
    expect(normalizeNote('  ')).toBeNull();
    expect(normalizeNote(null)).toBeNull();
  });

  it('enforces quantities, note length, strict bodies, and non-empty patches', () => {
    expect(addCartItemSchema.safeParse({ menuItemId, quantity: 0 }).success).toBe(false);
    expect(addCartItemSchema.safeParse({ menuItemId, quantity: 100 }).success).toBe(false);
    expect(addCartItemSchema.safeParse({ menuItemId, hidden: true }).success).toBe(false);
    expect(updateCartItemSchema.parse({ quantity: 0 })).toEqual({ quantity: 0 });
    expect(updateCartItemSchema.safeParse({}).success).toBe(false);
    expect(updateCartItemSchema.safeParse({ note: '😀'.repeat(501) }).success).toBe(false);
  });
});
