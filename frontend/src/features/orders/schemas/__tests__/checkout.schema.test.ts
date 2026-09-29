import { describe, expect, expectTypeOf, it } from 'vitest';

import type { CheckoutInput } from '../../types/order.type';
import { checkoutInputSchema, idempotencyKeySchema } from '../checkout.schema';

const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';
const tableId = '123E4567-E89B-42D3-A456-426614174000';

describe('checkout validation', () => {
  it('normalizes the exact TAKEAWAY body', () => {
    expect(
      checkoutInputSchema.parse({
        placeId,
        fulfillmentType: 'TAKEAWAY',
        customerName: '  Ayu   Lestari  ',
        customerNote: '  No plastic  ',
      }),
    ).toEqual({
      placeId: placeId.toLowerCase(),
      fulfillmentType: 'TAKEAWAY',
      customerName: 'Ayu Lestari',
      customerNote: 'No plastic',
    });
  });

  it('requires a table only for DINE_IN and rejects unsupported checkout fields', () => {
    expect(
      checkoutInputSchema.parse({
        placeId,
        fulfillmentType: 'DINE_IN',
        tableId,
        customerName: 'Ayu',
      }),
    ).toMatchObject({ tableId: tableId.toLowerCase() });
    expect(checkoutInputSchema.safeParse({ placeId, fulfillmentType: 'DINE_IN', customerName: 'Ayu' }).success).toBe(
      false,
    );
    expect(
      checkoutInputSchema.safeParse({
        placeId,
        fulfillmentType: 'TAKEAWAY',
        tableId,
        customerName: 'Ayu',
      }).success,
    ).toBe(false);
    expect(
      checkoutInputSchema.safeParse({
        placeId,
        fulfillmentType: 'TAKEAWAY',
        customerName: 'Ayu',
        payment: 'CASH',
      }).success,
    ).toBe(false);
  });

  it('enforces UUID, Unicode, note, and attempt-key limits', () => {
    expect(
      checkoutInputSchema.safeParse({ placeId: 'not-a-uuid', fulfillmentType: 'TAKEAWAY', customerName: 'Ayu' })
        .success,
    ).toBe(false);
    expect(
      checkoutInputSchema.safeParse({ placeId, fulfillmentType: 'TAKEAWAY', customerName: '😀'.repeat(101) }).success,
    ).toBe(false);
    expect(
      checkoutInputSchema.safeParse({
        placeId,
        fulfillmentType: 'TAKEAWAY',
        customerName: 'Ayu',
        customerNote: '😀'.repeat(501),
      }).success,
    ).toBe(false);
    expect(idempotencyKeySchema.safeParse('checkout:key_01-try.2').success).toBe(true);
    expect(idempotencyKeySchema.safeParse('contains spaces').success).toBe(false);
    expect(idempotencyKeySchema.safeParse('x'.repeat(256)).success).toBe(false);
  });

  it('makes invalid fulfillment shapes unrepresentable', () => {
    type Takeaway = Extract<CheckoutInput, { fulfillmentType: 'TAKEAWAY' }>;
    type DineIn = Extract<CheckoutInput, { fulfillmentType: 'DINE_IN' }>;

    expectTypeOf<Takeaway>().not.toHaveProperty('tableId');
    expectTypeOf<DineIn>().toHaveProperty('tableId').toEqualTypeOf<string>();
  });
});
