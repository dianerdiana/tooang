import {
  checkoutSchema,
  idempotencyKeySchema,
  listMyOrdersSchema,
  myOrderStatusSchema,
  operationalOrderStatusSchema,
  placeOrderCodeParamSchema,
} from './orders.schema';

const placeId = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
const tableId = 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB';

describe('checkout schemas', () => {
  it('normalizes DINE_IN customer and identifier fields', () => {
    expect(
      checkoutSchema.parse({
        placeId,
        fulfillmentType: 'DINE_IN',
        customerName: '  Ayu\t  Lestari  ',
        customerNote: ' Cafe\u0301\r\nplease ',
        tableId,
      }),
    ).toEqual({
      placeId: placeId.toLowerCase(),
      fulfillmentType: 'DINE_IN',
      customerName: 'Ayu Lestari',
      customerNote: 'Café\nplease',
      tableId: tableId.toLowerCase(),
    });
  });

  it('requires a table for DINE_IN and excludes it for TAKEAWAY', () => {
    const common = { placeId, customerName: 'Ayu' };
    expect(checkoutSchema.safeParse({ ...common, fulfillmentType: 'DINE_IN' }).success).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...common, fulfillmentType: 'TAKEAWAY', tableId: null }).success,
    ).toBe(false);
    expect(checkoutSchema.safeParse({ ...common, fulfillmentType: 'TAKEAWAY' }).success).toBe(true);
  });

  it('enforces text boundaries and rejects client-owned order fields', () => {
    const common = { placeId, fulfillmentType: 'TAKEAWAY', customerName: 'Ayu' };
    expect(checkoutSchema.safeParse({ ...common, customerName: ' ' }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...common, customerName: '😀'.repeat(101) }).success).toBe(
      false,
    );
    expect(checkoutSchema.safeParse({ ...common, customerNote: '😀'.repeat(501) }).success).toBe(
      false,
    );
    expect(checkoutSchema.safeParse({ ...common, subtotal: 1 }).success).toBe(false);
  });

  it('accepts only bounded case-sensitive transport keys', () => {
    for (const key of ['request-1', 'Request_1:retry.2']) {
      expect(idempotencyKeySchema.parse(key)).toBe(key);
    }
    for (const key of ['', 'contains space', 'x'.repeat(256)]) {
      expect(idempotencyKeySchema.safeParse(key).success).toBe(false);
    }
  });
});

describe('order lifecycle schemas', () => {
  it('bounds pagination, normalizes UUID filters, and rejects unknown filters', () => {
    expect(listMyOrdersSchema.parse({ placeId })).toEqual({
      page: 1,
      limit: 20,
      placeId: placeId.toLowerCase(),
    });
    expect(listMyOrdersSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(listMyOrdersSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(listMyOrdersSchema.safeParse({ search: 'secret' }).success).toBe(false);
  });

  it('normalizes order codes and cancellation reasons', () => {
    expect(
      placeOrderCodeParamSchema.parse({
        placeId,
        orderCode: ' tng-20260915-abcdefgh ',
      }),
    ).toEqual({ placeId: placeId.toLowerCase(), orderCode: 'TNG-20260915-ABCDEFGH' });
    expect(
      myOrderStatusSchema.parse({
        status: 'CANCELLED',
        cancellationReason: ' Cafe\u0301\r\nclosed ',
      }),
    ).toEqual({ status: 'CANCELLED', cancellationReason: 'Café\nclosed' });
  });

  it('excludes EXPIRED and rejects cancellation data for non-cancellation transitions', () => {
    expect(operationalOrderStatusSchema.safeParse({ status: 'EXPIRED' }).success).toBe(false);
    expect(
      operationalOrderStatusSchema.safeParse({
        status: 'CONFIRMED',
        cancellationReason: 'not applicable',
      }).success,
    ).toBe(false);
    expect(
      operationalOrderStatusSchema.safeParse({
        status: 'CANCELLED',
        cancellationReason: '😀'.repeat(501),
      }).success,
    ).toBe(false);
  });
});
