import { z } from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;

export const normalizeUuid = (value: string) => value.toLowerCase();

export const normalizeNote = (value: string | null): string | null => {
  if (value === null) return null;
  const normalized = value.normalize('NFC').replace(/\r\n?/gu, '\n').trim();
  return normalized || null;
};

export const optionalNoteSchema = z
  .union([z.string(), z.null()])
  .transform(normalizeNote)
  .refine(
    (value) => value === null || unicodeLength(value) <= 500,
    'Note must contain at most 500 characters',
  );

const uuid = z.string().uuid().transform(normalizeUuid);

export const cartPlaceParamSchema = z.object({ placeId: uuid }).strict();
export const cartItemParamSchema = z.object({ placeId: uuid, menuItemId: uuid }).strict();

export const addCartItemSchema = z
  .object({
    menuItemId: uuid,
    quantity: z.number().int().min(1).max(99).default(1),
    note: optionalNoteSchema.optional(),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(0).max(99).optional(),
    note: optionalNoteSchema.optional(),
  })
  .strict()
  .refine((value) => value.quantity !== undefined || value.note !== undefined, {
    message: 'At least one supported field is required',
  });

export type CartPlaceParam = z.infer<typeof cartPlaceParamSchema>;
export type CartItemParam = z.infer<typeof cartItemParamSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
