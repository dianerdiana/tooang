import { describe, expect, it } from 'vitest';

import type { CheckoutInput } from '../../types/order.type';
import {
  canonicalizeCheckoutInput,
  CHECKOUT_ATTEMPT_STATE,
  CHECKOUT_ATTEMPT_STORAGE_PREFIX,
  CHECKOUT_ATTEMPT_TTL_MS,
  type CheckoutAttemptEnvironment,
  type CheckoutAttemptStorage,
  clearAllCheckoutAttempts,
  clearCheckoutAttempt,
  createOrReuseCheckoutAttempt,
  fingerprintCheckoutInput,
  readCheckoutAttempt,
  transitionCheckoutAttempt,
} from '../checkout-attempt';

const userId = '123e4567-e89b-42d3-a456-426614174001';
const placeId = '123e4567-e89b-42d3-a456-426614174002';
const now = Date.UTC(2026, 8, 29);
const input: CheckoutInput = {
  placeId,
  fulfillmentType: 'TAKEAWAY',
  customerName: ' Ayu ',
  customerNote: '  Less sugar  ',
};

class MemoryStorage implements CheckoutAttemptStorage {
  readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
}

const digest = async (buffer: ArrayBuffer) => {
  const result = new Uint8Array(32);
  new Uint8Array(buffer).forEach((byte, index) => {
    result[index % result.length] = (result[index % result.length] + byte + index) % 256;
  });
  return result.buffer;
};

const environment = (storage: CheckoutAttemptStorage, time = now): CheckoutAttemptEnvironment => ({
  storage,
  now: () => time,
  createId: () => '123e4567-e89b-42d3-a456-426614174003',
  digest,
});

describe('checkout attempts', () => {
  it('normalizes deterministically and creates a compliant scoped attempt', async () => {
    const storage = new MemoryStorage();
    const result = await createOrReuseCheckoutAttempt({ userId, input }, environment(storage));

    expect(result.status).toBe('created');
    expect(result.attempt.idempotencyKey).toBe('checkout:123e4567-e89b-42d3-a456-426614174003');
    expect(result.attempt.input).toEqual({ ...input, customerName: 'Ayu', customerNote: 'Less sugar' });
    expect(result.attempt.expiresAt - result.attempt.createdAt).toBe(CHECKOUT_ATTEMPT_TTL_MS);
    expect(result.attempt.fingerprint).toHaveLength(64);
    expect(canonicalizeCheckoutInput(result.attempt.input)).toBe(
      canonicalizeCheckoutInput({ ...input, customerName: 'Ayu', customerNote: 'Less sugar' }),
    );
  });

  it('reuses equivalent details and blocks changed details until abandonment', async () => {
    const storage = new MemoryStorage();
    const env = environment(storage);
    const created = await createOrReuseCheckoutAttempt({ userId, input }, env);
    const reused = await createOrReuseCheckoutAttempt(
      { userId, input: { ...input, customerName: 'Ayu', customerNote: 'Less sugar' } },
      env,
    );
    const mismatch = await createOrReuseCheckoutAttempt({ userId, input: { ...input, customerName: 'Budi' } }, env);

    expect(reused).toMatchObject({ status: 'reused', attempt: { idempotencyKey: created.attempt.idempotencyKey } });
    expect(mismatch).toMatchObject({ status: 'payload-mismatch', attempt: { input: created.attempt.input } });

    clearCheckoutAttempt({ userId, placeId }, env);
    const replacement = await createOrReuseCheckoutAttempt(
      { userId, input: { ...input, customerName: 'Budi' } },
      { ...env, createId: () => '123e4567-e89b-42d3-a456-426614174004' },
    );
    expect(replacement.status).toBe('created');
    expect(replacement.attempt.input.customerName).toBe('Budi');
  });

  it('restores an interrupted submission as uncertain with the same key and request', async () => {
    const storage = new MemoryStorage();
    const env = environment(storage);
    const created = await createOrReuseCheckoutAttempt({ userId, input }, env);
    transitionCheckoutAttempt(created.attempt, CHECKOUT_ATTEMPT_STATE.SUBMITTING, env);

    const restored = await readCheckoutAttempt({ userId, placeId }, env);
    expect(restored).toMatchObject({
      state: CHECKOUT_ATTEMPT_STATE.UNCERTAIN,
      idempotencyKey: created.attempt.idempotencyKey,
      input: created.attempt.input,
    });
  });

  it('discards expired, malformed, and mismatched-scope records', async () => {
    const storage = new MemoryStorage();
    const env = environment(storage);
    await createOrReuseCheckoutAttempt({ userId, input }, env);

    expect(
      await readCheckoutAttempt({ userId, placeId }, environment(storage, now + CHECKOUT_ATTEMPT_TTL_MS)),
    ).toBeNull();
    expect(storage.length).toBe(0);

    storage.setItem(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${userId}.${placeId}`, '{bad json');
    expect(await readCheckoutAttempt({ userId, placeId }, env)).toBeNull();
    expect(storage.length).toBe(0);

    await createOrReuseCheckoutAttempt({ userId, input }, env);
    expect(await readCheckoutAttempt({ userId: '123e4567-e89b-42d3-a456-426614174009', placeId }, env)).toBeNull();
  });

  it('keeps an in-memory attempt when persistence fails and clears only checkout records', async () => {
    const brokenStorage: CheckoutAttemptStorage = {
      length: 0,
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
      key: () => null,
    };
    const created = await createOrReuseCheckoutAttempt({ userId, input }, environment(brokenStorage));
    expect(created.status).toBe('created');

    const storage = new MemoryStorage();
    storage.setItem('unrelated', 'keep');
    await createOrReuseCheckoutAttempt({ userId, input }, environment(storage));
    clearAllCheckoutAttempts(environment(storage));
    expect(storage.getItem('unrelated')).toBe('keep');
    expect(storage.length).toBe(1);
  });

  it('changes the fingerprint when normalized request details change', async () => {
    const first = await fingerprintCheckoutInput(input, { digest });
    const second = await fingerprintCheckoutInput({ ...input, customerNote: 'No ice' }, { digest });
    expect(first).not.toBe(second);
  });
});
