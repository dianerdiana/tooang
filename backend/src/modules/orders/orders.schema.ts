import { z } from 'zod';

import { FulfillmentType, OrderStatus } from '@/generated/prisma/client';

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

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

const orderFilters = {
  status: z.enum(OrderStatus).optional(),
  fulfillmentType: z.enum(FulfillmentType).optional(),
};

export const listMyOrdersSchema = z
  .object({ ...pagination, ...orderFilters, placeId: uuid.optional() })
  .strict();

export const listPlaceOrdersSchema = z.object({ ...pagination, ...orderFilters }).strict();

export const listGlobalOrdersSchema = z
  .object({ ...pagination, ...orderFilters, placeId: uuid.optional() })
  .strict();

export const orderIdParamSchema = z.object({ orderId: uuid }).strict();
export const placeOrderParamSchema = z.object({ placeId: uuid, orderId: uuid }).strict();
export const placeOrderCodeParamSchema = z
  .object({
    placeId: uuid,
    orderCode: z
      .string()
      .transform((value) => value.normalize('NFC').trim().toUpperCase())
      .refine((value) => /^TNG-\d{8}-[0-9A-HJKMNP-TV-Z]{8}$/u.test(value), {
        message: 'Invalid order code',
      }),
  })
  .strict();

const cancellationReason = z
  .union([z.string(), z.null()])
  .transform(normalizeNote)
  .refine(
    (value) => value === null || unicodeLength(value) <= 500,
    'Cancellation reason must contain at most 500 characters',
  );

export const myOrderStatusSchema = z
  .object({
    status: z.literal(OrderStatus.CANCELLED),
    cancellationReason: cancellationReason.optional(),
  })
  .strict();

export const operationalOrderStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(OrderStatus.CONFIRMED) }).strict(),
  z.object({ status: z.literal(OrderStatus.PREPARING) }).strict(),
  z.object({ status: z.literal(OrderStatus.READY) }).strict(),
  z.object({ status: z.literal(OrderStatus.COMPLETED) }).strict(),
  z
    .object({
      status: z.literal(OrderStatus.CANCELLED),
      cancellationReason: cancellationReason.optional(),
    })
    .strict(),
]);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;
export type ListMyOrdersInput = z.infer<typeof listMyOrdersSchema>;
export type ListPlaceOrdersInput = z.infer<typeof listPlaceOrdersSchema>;
export type ListGlobalOrdersInput = z.infer<typeof listGlobalOrdersSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type PlaceOrderParam = z.infer<typeof placeOrderParamSchema>;
export type PlaceOrderCodeParam = z.infer<typeof placeOrderCodeParamSchema>;
export type MyOrderStatusInput = z.infer<typeof myOrderStatusSchema>;
export type OperationalOrderStatusInput = z.infer<typeof operationalOrderStatusSchema>;
