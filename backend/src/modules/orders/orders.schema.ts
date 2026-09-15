import { z } from 'zod';

import { normalizeNote, normalizeUuid } from '@/modules/carts/carts.schema';

const unicodeLength = (value: string) => Array.from(value).length;
const uuid = z.string().uuid().transform(normalizeUuid);

const customerName = z
  .string()
  .transform((value) => value.normalize('NFC').trim().replace(/\s+/gu, ' '))
  .refine((value) => unicodeLength(value) >= 1, 'Customer name is required')
  .refine(
    (value) => unicodeLength(value) <= 100,
    'Customer name must contain at most 100 characters',
  );

const customerNote = z
  .union([z.string(), z.null()])
  .transform(normalizeNote)
  .refine(
    (value) => value === null || unicodeLength(value) <= 500,
    'Customer note must contain at most 500 characters',
  );

const checkoutBase = {
  placeId: uuid,
  customerName,
  customerNote: customerNote.optional(),
};

export const checkoutSchema = z.discriminatedUnion('fulfillmentType', [
  z
    .object({
      ...checkoutBase,
      fulfillmentType: z.literal('DINE_IN'),
      tableId: uuid,
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
  .string({ error: 'Idempotency-Key header is required' })
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9._:-]+$/u, 'Idempotency-Key contains unsupported characters');

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;
