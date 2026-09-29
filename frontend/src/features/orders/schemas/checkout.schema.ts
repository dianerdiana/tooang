import { z } from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;
const checkoutUuidSchema = z.string().trim().toLowerCase().uuid();

export const CHECKOUT_CUSTOMER_NAME_MAX_LENGTH = 100;
export const CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH = 500;

export const checkoutCustomerNameSchema = z
  .string()
  .transform((value) => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
  .refine((value) => unicodeLength(value) >= 1, 'Enter a customer name')
  .refine(
    (value) => unicodeLength(value) <= CHECKOUT_CUSTOMER_NAME_MAX_LENGTH,
    `Use at most ${CHECKOUT_CUSTOMER_NAME_MAX_LENGTH} characters`,
  );

export const checkoutCustomerNoteSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const normalized = value.normalize('NFC').replace(/\r\n?/gu, '\n').trim();
    return normalized || null;
  })
  .refine(
    (value) => value === null || unicodeLength(value) <= CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH,
    `Use at most ${CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH} characters`,
  );

export const checkoutFormNoteSchema = z
  .string()
  .refine(
    (value) => unicodeLength(value) <= CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH,
    `Use at most ${CHECKOUT_CUSTOMER_NOTE_MAX_LENGTH} characters`,
  );

const checkoutBase = {
  placeId: checkoutUuidSchema,
  customerName: checkoutCustomerNameSchema,
  customerNote: checkoutCustomerNoteSchema.optional(),
};

export const checkoutInputSchema = z.discriminatedUnion('fulfillmentType', [
  z
    .object({
      ...checkoutBase,
      fulfillmentType: z.literal('DINE_IN'),
      tableId: checkoutUuidSchema,
    })
    .strict(),
  z
    .object({
      ...checkoutBase,
      fulfillmentType: z.literal('TAKEAWAY'),
    })
    .strict(),
]);

export const idempotencyKeySchema = z
  .string()
  .min(1, 'A checkout attempt key is required')
  .max(255, 'The checkout attempt key is too long')
  .regex(/^[A-Za-z0-9._:-]+$/u, 'The checkout attempt key contains unsupported characters');

export const checkoutFormSchema = z
  .object({
    customerName: checkoutCustomerNameSchema,
    customerNote: checkoutFormNoteSchema,
  })
  .strict();
