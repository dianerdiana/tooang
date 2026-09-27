import { createHash, randomBytes } from 'node:crypto';

import type { CheckoutInput, CreateManualOrderInput } from './orders.schema';

export const CHECKOUT_ENDPOINT = '/api/v1/me/orders';
export const CHECKOUT_IDENTITY_VERSION = 'tooang.checkout.v1';
export const MANUAL_ORDER_IDENTITY_VERSION = 'tooang.manual-order.v1';

export function canonicalCheckoutInput(input: CheckoutInput): readonly unknown[] {
  return [
    CHECKOUT_IDENTITY_VERSION,
    input.placeId,
    input.fulfillmentType,
    input.customerName,
    input.customerNote ?? null,
    input.fulfillmentType === 'DINE_IN' ? input.tableId : null,
  ];
}

export function hashCheckoutInput(input: CheckoutInput): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalCheckoutInput(input)), 'utf8')
    .digest('hex');
}

export function hashManualOrderInput(placeId: string, input: CreateManualOrderInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        MANUAL_ORDER_IDENTITY_VERSION,
        placeId,
        input.fulfillmentType,
        input.customerName,
        input.customerNote ?? null,
        input.fulfillmentType === 'DINE_IN' ? input.tableId : null,
        input.items.map((item) => [item.menuItemId, item.quantity, item.note ?? null]),
      ]),
      'utf8',
    )
    .digest('hex');
}

export function idempotencyAdvisoryLockId(userId: string, endpoint: string, key: string): bigint {
  return createHash('sha256')
    .update(`${userId}\0${endpoint}\0${key}`, 'utf8')
    .digest()
    .readBigInt64BE(0);
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateOrderCode(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  const bytes = randomBytes(8);
  let suffix = '';
  for (const byte of bytes) suffix += CROCKFORD[byte & 31];
  return `TNG-${date}-${suffix}`;
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}
