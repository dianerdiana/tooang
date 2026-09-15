import {
  canonicalCheckoutInput,
  generateOrderCode,
  generateVerificationToken,
  hashCheckoutInput,
  idempotencyAdvisoryLockId,
} from './checkout-identity';
import { checkoutSchema } from './orders.schema';

describe('checkout request identity', () => {
  it('matches the fixed DINE_IN hash vector', () => {
    const input = checkoutSchema.parse({
      placeId: '11111111-1111-4111-8111-111111111111',
      fulfillmentType: 'DINE_IN',
      customerName: 'Ayu Lestari',
      customerNote: 'No peanuts\nplease',
      tableId: '22222222-2222-4222-8222-222222222222',
    });
    expect(JSON.stringify(canonicalCheckoutInput(input))).toBe(
      '["tooang.checkout.v1","11111111-1111-4111-8111-111111111111","DINE_IN","Ayu Lestari","No peanuts\\nplease","22222222-2222-4222-8222-222222222222"]',
    );
    expect(hashCheckoutInput(input)).toBe(
      '59453e18fd7f5fc8e5ba07ef6f29a0ca38f51c68ff761da001978ac37200e337',
    );
  });

  it('matches the fixed TAKEAWAY hash vector', () => {
    const input = checkoutSchema.parse({
      placeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      fulfillmentType: 'TAKEAWAY',
      customerName: 'Budi',
    });
    expect(hashCheckoutInput(input)).toBe(
      '32be5b805219e9bc66cb47c521a4ed2008c1d0ee5d5c8cf62ba79a6b9188bc8d',
    );
  });

  it('hashes normalized semantics instead of raw JSON form', () => {
    const first = checkoutSchema.parse({
      customerNote: null,
      customerName: '  Budi ',
      fulfillmentType: 'TAKEAWAY',
      placeId: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',
    });
    const second = checkoutSchema.parse({
      placeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      fulfillmentType: 'TAKEAWAY',
      customerName: 'Budi',
    });
    expect(hashCheckoutInput(first)).toBe(hashCheckoutInput(second));
    expect(hashCheckoutInput({ ...second, customerName: 'Budi S' })).not.toBe(
      hashCheckoutInput(second),
    );
  });

  it('generates human-readable codes and opaque tokens', () => {
    expect(generateOrderCode(new Date('2026-09-15T12:00:00Z'))).toMatch(
      /^TNG-20260915-[0-9A-HJKMNP-TV-Z]{8}$/u,
    );
    const token = generateVerificationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(idempotencyAdvisoryLockId('user', 'endpoint', 'key')).toBe(
      idempotencyAdvisoryLockId('user', 'endpoint', 'key'),
    );
  });
});
