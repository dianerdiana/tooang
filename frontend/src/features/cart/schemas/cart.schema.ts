import { z } from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;

export const CART_MAX_DISTINCT_ITEMS = 50;
export const CART_MAX_AGGREGATE_QUANTITY = 200;
export const CART_MAX_ITEM_QUANTITY = 99;
export const CART_MAX_NOTE_LENGTH = 500;

export const normalizeCartNote = (value: string | null): string | null => {
  if (value === null) return null;
  const normalized = value.normalize('NFC').replace(/\r\n?/gu, '\n').trim();
  return normalized || null;
};

export const cartUuidSchema = z.string().trim().toLowerCase().uuid();

export const cartNoteSchema = z
  .union([z.string(), z.null()])
  .transform(normalizeCartNote)
  .refine(
    (value) => value === null || unicodeLength(value) <= CART_MAX_NOTE_LENGTH,
    `Use at most ${CART_MAX_NOTE_LENGTH} characters`,
  );

export const addCartItemSchema = z
  .object({
    menuItemId: cartUuidSchema,
    quantity: z.number().int().min(1).max(CART_MAX_ITEM_QUANTITY).default(1),
    note: cartNoteSchema.optional(),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(0).max(CART_MAX_ITEM_QUANTITY).optional(),
    note: cartNoteSchema.optional(),
  })
  .strict()
  .refine((value) => value.quantity !== undefined || value.note !== undefined, {
    message: 'Change the quantity or note',
  });

const cartItemSchema = z.object({
  menuItemId: cartUuidSchema,
  name: z.string(),
  type: z.enum(['FOOD', 'DRINK']),
  category: z.object({ categoryId: cartUuidSchema, name: z.string() }),
  unitPrice: z.number().finite().nonnegative(),
  quantity: z.number().int().min(1).max(CART_MAX_ITEM_QUANTITY),
  note: cartNoteSchema,
});

const removedCartItemSchema = z.object({
  menuItemId: cartUuidSchema,
  reason: z.enum(['ITEM_DELETED', 'ITEM_UNAVAILABLE', 'CATEGORY_DELETED', 'CATEGORY_INACTIVE']),
});

export const cartSchema = z
  .object({
    cartId: cartUuidSchema.nullable(),
    placeId: cartUuidSchema,
    distinctItemCount: z.number().int().min(0).max(CART_MAX_DISTINCT_ITEMS),
    aggregateQuantity: z.number().int().min(0).max(CART_MAX_AGGREGATE_QUANTITY),
    items: z.array(cartItemSchema).max(CART_MAX_DISTINCT_ITEMS),
    removedItems: z.array(removedCartItemSchema).max(CART_MAX_DISTINCT_ITEMS),
  })
  .superRefine((cart, context) => {
    if (cart.cartId === null && cart.items.length > 0) {
      context.addIssue({ code: 'custom', path: ['cartId'], message: 'A populated cart must have an identity' });
    }
    if (cart.distinctItemCount !== cart.items.length) {
      context.addIssue({ code: 'custom', path: ['distinctItemCount'], message: 'Cart item count is inconsistent' });
    }
    const aggregate = cart.items.reduce((total, item) => total + item.quantity, 0);
    if (cart.aggregateQuantity !== aggregate) {
      context.addIssue({ code: 'custom', path: ['aggregateQuantity'], message: 'Cart quantity is inconsistent' });
    }
  });

export const parseCart = (value: unknown, expectedPlaceId?: string) => {
  const cart = cartSchema.parse(value);
  if (expectedPlaceId && cart.placeId !== cartUuidSchema.parse(expectedPlaceId)) {
    throw new Error('Cart response did not match the requested place');
  }
  return cart;
};
