import { describe, expect, it } from 'vitest';

import {
  clearProtectedActionIntent,
  consumeProtectedActionIntent,
  createProtectedActionIntent,
  getProtectedActionReturnTarget,
  INTENT_STORAGE_KEY,
  INTENT_TTL_MS,
  type IntentStorage,
  type ProtectedActionIntentInput,
  readProtectedActionIntent,
} from '../protected-action-intent';

const NOW = Date.parse('2026-09-28T10:00:00.000Z');
const INTENT_ID = '92f3f96b-c1ee-4d74-97cb-e0230767276b';
const PLACE_ID = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const OTHER_PLACE_ID = '42219512-b86b-4b05-8816-f8ee7f52fc65';
const MENU_ITEM_ID = '8f95e179-a74f-46e0-aea8-e796a297c667';

class MemoryStorage implements IntentStorage {
  readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const environment = (storage: IntentStorage, now = NOW) => ({
  storage,
  now: () => now,
  createId: () => INTENT_ID,
  origin: 'https://tooang.test',
});

describe('protected action intent creation', () => {
  it.each<[ProtectedActionIntentInput, string]>([
    [
      {
        kind: 'add-to-cart',
        payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', menuItemId: MENU_ITEM_ID, quantity: 2, note: 'Mild' },
        returnTo: '/places/warung-kita/menu?type=FOOD#menu',
      },
      '/places/warung-kita/menu?type=FOOD#menu',
    ],
    [{ kind: 'checkout', payload: { placeId: PLACE_ID, placeSlug: 'warung-kita' } }, '/places/warung-kita/checkout'],
    [{ kind: 'orders', payload: {} }, '/orders'],
    [{ kind: 'account', payload: { destination: 'reviews' } }, '/account/reviews'],
    [{ kind: 'review', payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', target: 'place' } }, '/orders'],
  ])('stores an allowlisted $kind intent with its logical destination', (input, returnTo) => {
    const storage = new MemoryStorage();
    const intent = createProtectedActionIntent(input, environment(storage));

    expect(intent).toMatchObject({ version: 1, id: INTENT_ID, kind: input.kind, returnTo, createdAt: NOW });
    expect(intent?.expiresAt).toBe(NOW + INTENT_TTL_MS);
    expect(readProtectedActionIntent(environment(storage))).toEqual(intent);
  });

  it('replaces the prior record when a newer action is saved', () => {
    const storage = new MemoryStorage();
    createProtectedActionIntent({ kind: 'orders', payload: {} }, environment(storage));
    createProtectedActionIntent(
      { kind: 'account', payload: { destination: 'profile' } },
      { ...environment(storage), createId: () => 'd834e69b-39f1-4a02-9a6c-1430eeb67761' },
    );

    expect(readProtectedActionIntent(environment(storage))).toMatchObject({
      id: 'd834e69b-39f1-4a02-9a6c-1430eeb67761',
      kind: 'account',
    });
  });

  it.each([
    {
      kind: 'add-to-cart',
      payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', menuItemId: MENU_ITEM_ID, quantity: 0 },
    },
    {
      kind: 'add-to-cart',
      payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', menuItemId: MENU_ITEM_ID, quantity: 1, price: 20_000 },
    },
    { kind: 'checkout', payload: { placeId: 'not-a-uuid', placeSlug: 'warung-kita' } },
    { kind: 'account', payload: { destination: 'admin' } },
    { kind: 'orders', payload: { accessToken: 'secret' } },
    {
      kind: 'review',
      payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', target: 'place', rating: 5 },
    },
  ])('rejects malformed or excessive input %#', (input) => {
    const storage = new MemoryStorage();
    expect(createProtectedActionIntent(input as ProtectedActionIntentInput, environment(storage))).toBeNull();
    expect(storage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });

  it.each([
    'https://tooang.test/orders',
    '//evil.test/orders',
    '/\\evil.test/orders',
    '/places/another-place/menu',
    '/orders',
  ])('rejects unsafe or kind-incompatible return URL %s', (returnTo) => {
    const storage = new MemoryStorage();
    const input: ProtectedActionIntentInput = {
      kind: 'add-to-cart',
      payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', menuItemId: MENU_ITEM_ID, quantity: 1 },
      returnTo,
    };
    expect(createProtectedActionIntent(input, environment(storage))).toBeNull();
  });
});

describe('protected action intent reading and expiry', () => {
  it('accepts the instant before expiry and clears at the expiry boundary', () => {
    const storage = new MemoryStorage();
    createProtectedActionIntent({ kind: 'orders', payload: {} }, environment(storage));

    expect(readProtectedActionIntent(environment(storage, NOW + INTENT_TTL_MS - 1))).not.toBeNull();
    expect(readProtectedActionIntent(environment(storage, NOW + INTENT_TTL_MS))).toBeNull();
    expect(storage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });

  it.each([
    '{broken',
    JSON.stringify({ version: 2, kind: 'orders' }),
    JSON.stringify({ version: 1, kind: 'unsupported' }),
  ])('purges malformed or unsupported storage', (serialized) => {
    const storage = new MemoryStorage();
    storage.setItem(INTENT_STORAGE_KEY, serialized);
    expect(readProtectedActionIntent(environment(storage))).toBeNull();
    expect(storage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });

  it('degrades safely when storage is unavailable', () => {
    const storage: IntentStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };

    expect(createProtectedActionIntent({ kind: 'orders', payload: {} }, environment(storage))).toBeNull();
    expect(readProtectedActionIntent(environment(storage))).toBeNull();
    expect(() => clearProtectedActionIntent(storage)).not.toThrow();
  });

  it('degrades safely when ID generation is unavailable', () => {
    const storage = new MemoryStorage();
    expect(
      createProtectedActionIntent(
        { kind: 'orders', payload: {} },
        {
          ...environment(storage),
          createId: () => {
            throw new Error('unavailable');
          },
        },
      ),
    ).toBeNull();
    expect(storage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });
});

describe('protected action intent consumption', () => {
  it('consumes a matching intent exactly once', () => {
    const storage = new MemoryStorage();
    createProtectedActionIntent({ kind: 'orders', payload: {} }, environment(storage));
    const options = { ...environment(storage), currentUrl: '/orders', intentId: INTENT_ID };

    expect(consumeProtectedActionIntent(options)).toMatchObject({ status: 'consumed', intent: { kind: 'orders' } });
    expect(consumeProtectedActionIntent(options)).toEqual({ status: 'missing' });
  });

  it.each([
    { currentUrl: '/places/warung-kita/menu', placeId: OTHER_PLACE_ID, menuItemId: MENU_ITEM_ID },
    { currentUrl: '/places/warung-kita/menu', placeId: PLACE_ID, menuItemId: OTHER_PLACE_ID },
    { currentUrl: '/places/another-place/menu', placeId: PLACE_ID, menuItemId: MENU_ITEM_ID },
  ])('clears a cross-place, cross-item, or cross-route mismatch', (context) => {
    const storage = new MemoryStorage();
    createProtectedActionIntent(
      {
        kind: 'add-to-cart',
        payload: { placeId: PLACE_ID, placeSlug: 'warung-kita', menuItemId: MENU_ITEM_ID, quantity: 1 },
      },
      environment(storage),
    );

    expect(consumeProtectedActionIntent({ ...environment(storage), ...context })).toEqual({ status: 'mismatch' });
    expect(storage.getItem(INTENT_STORAGE_KEY)).toBeNull();
  });

  it('does not remove a newer record when an old login URL supplies another ID', () => {
    const storage = new MemoryStorage();
    createProtectedActionIntent({ kind: 'orders', payload: {} }, environment(storage));

    expect(
      consumeProtectedActionIntent({
        ...environment(storage),
        currentUrl: '/orders',
        intentId: 'd834e69b-39f1-4a02-9a6c-1430eeb67761',
      }),
    ).toEqual({ status: 'missing' });
    expect(readProtectedActionIntent(environment(storage))).not.toBeNull();
  });
});

describe('login return target selection', () => {
  it('prefers a matching valid intent and otherwise uses the sanitized redirect', () => {
    const storage = new MemoryStorage();
    createProtectedActionIntent({ kind: 'account', payload: { destination: 'profile' } }, environment(storage));

    expect(getProtectedActionReturnTarget(INTENT_ID, '/orders', environment(storage))).toBe('/account/profile');
    expect(
      getProtectedActionReturnTarget('d834e69b-39f1-4a02-9a6c-1430eeb67761', '/orders', environment(storage)),
    ).toBe('/orders');
    expect(getProtectedActionReturnTarget(undefined, 'https://evil.test', environment(storage))).toBe('/');
  });
});
