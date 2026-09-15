import { createHash, randomBytes } from 'node:crypto';

import type { CheckoutInput } from './orders.schema';

export const CHECKOUT_ENDPOINT = '/api/v1/me/orders';
export const CHECKOUT_IDENTITY_VERSION = 'tooang.checkout.v1';

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
