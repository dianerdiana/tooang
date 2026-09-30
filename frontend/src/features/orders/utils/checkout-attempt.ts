import { z } from 'zod';

import { checkoutInputSchema, idempotencyKeySchema } from '../schemas/checkout.schema';
import type { CheckoutInput } from '../types/order.type';

export const CHECKOUT_ATTEMPT_VERSION = 1 as const;
export const CHECKOUT_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000;
export const CHECKOUT_ATTEMPT_STORAGE_PREFIX = 'tooang.checkout-attempt.v1';

const scopedUuidSchema = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const fingerprintSchema = z.string().regex(/^[a-f0-9]{64}$/u);

export const CHECKOUT_ATTEMPT_STATE = {
  READY: 'ready',
  SUBMITTING: 'submitting',
  UNCERTAIN: 'uncertain',
  BLOCKED: 'blocked',
} as const;

export type CheckoutAttemptState = (typeof CHECKOUT_ATTEMPT_STATE)[keyof typeof CHECKOUT_ATTEMPT_STATE];

const checkoutAttemptSchema = z
  .object({
    version: z.literal(CHECKOUT_ATTEMPT_VERSION),
    userId: scopedUuidSchema,
    placeId: scopedUuidSchema,
    input: checkoutInputSchema,
    idempotencyKey: idempotencyKeySchema,
    fingerprint: fingerprintSchema,
    state: z.enum(CHECKOUT_ATTEMPT_STATE),
    createdAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    recoveryCheckedAt: z.number().int().nonnegative().optional(),
  })
  .strict();

export type CheckoutAttempt = z.output<typeof checkoutAttemptSchema>;
export type CheckoutAttemptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'length' | 'key'>;

export type CheckoutAttemptEnvironment = {
  storage?: CheckoutAttemptStorage | null;
  now?: () => number;
  createId?: () => string;
  digest?: (value: ArrayBuffer) => Promise<ArrayBuffer>;
};

export type CreateCheckoutAttemptResult =
  { status: 'created' | 'reused'; attempt: CheckoutAttempt } | { status: 'payload-mismatch'; attempt: CheckoutAttempt };

const getStorage = (storage?: CheckoutAttemptStorage | null) => {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const storageKey = (userId: string, placeId: string) =>
  `${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.${userId.toLowerCase()}.${placeId.toLowerCase()}`;

export const canonicalizeCheckoutInput = (input: CheckoutInput) => {
  const parsed = checkoutInputSchema.parse(input);
  const common = {
    placeId: parsed.placeId,
    fulfillmentType: parsed.fulfillmentType,
    customerName: parsed.customerName,
    customerNote: parsed.customerNote ?? null,
  };
  return JSON.stringify(parsed.fulfillmentType === 'DINE_IN' ? { ...common, tableId: parsed.tableId } : common);
};

const bytesToHex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const fingerprintCheckoutInput = async (input: CheckoutInput, environment: CheckoutAttemptEnvironment = {}) => {
  const bytes = new TextEncoder().encode(canonicalizeCheckoutInput(input));
  const digest =
    environment.digest ??
    ((value: ArrayBuffer) => {
      if (!globalThis.crypto?.subtle) throw new Error('Secure checkout recovery is unavailable');
      return globalThis.crypto.subtle.digest('SHA-256', value);
    });
  return bytesToHex(await digest(bytes.buffer));
};

const removeStoredAttempt = (userId: string, placeId: string, storage?: CheckoutAttemptStorage | null) => {
  try {
    getStorage(storage)?.removeItem(storageKey(userId, placeId));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
};

const storeAttempt = (attempt: CheckoutAttempt, storage?: CheckoutAttemptStorage | null) => {
  try {
    getStorage(storage)?.setItem(storageKey(attempt.userId, attempt.placeId), JSON.stringify(attempt));
  } catch {
    // The caller retains the in-memory attempt when persistence is unavailable.
  }
  return attempt;
};

export async function readCheckoutAttempt(
  scope: { userId: string; placeId: string },
  environment: CheckoutAttemptEnvironment = {},
): Promise<CheckoutAttempt | null> {
  const parsedScope = z.object({ userId: scopedUuidSchema, placeId: scopedUuidSchema }).safeParse(scope);
  if (!parsedScope.success) return null;

  const storage = getStorage(environment.storage);
  if (!storage) return null;
  try {
    const serialized = storage.getItem(storageKey(parsedScope.data.userId, parsedScope.data.placeId));
    if (!serialized) return null;
    const parsed = checkoutAttemptSchema.safeParse(JSON.parse(serialized));
    const now = (environment.now ?? Date.now)();
    if (
      !parsed.success ||
      parsed.data.userId !== parsedScope.data.userId ||
      parsed.data.placeId !== parsedScope.data.placeId ||
      parsed.data.input.placeId !== parsedScope.data.placeId ||
      parsed.data.createdAt > now ||
      parsed.data.expiresAt <= now ||
      parsed.data.expiresAt - parsed.data.createdAt !== CHECKOUT_ATTEMPT_TTL_MS ||
      (await fingerprintCheckoutInput(parsed.data.input, environment)) !== parsed.data.fingerprint
    ) {
      removeStoredAttempt(parsedScope.data.userId, parsedScope.data.placeId, storage);
      return null;
    }

    if (parsed.data.state === CHECKOUT_ATTEMPT_STATE.SUBMITTING) {
      return storeAttempt({ ...parsed.data, state: CHECKOUT_ATTEMPT_STATE.UNCERTAIN }, storage);
    }
    return parsed.data;
  } catch {
    removeStoredAttempt(parsedScope.data.userId, parsedScope.data.placeId, storage);
    return null;
  }
}

export async function createOrReuseCheckoutAttempt(
  scope: { userId: string; input: CheckoutInput },
  environment: CheckoutAttemptEnvironment = {},
): Promise<CreateCheckoutAttemptResult> {
  const userId = scopedUuidSchema.parse(scope.userId);
  const input = checkoutInputSchema.parse(scope.input);
  const existing = await readCheckoutAttempt({ userId, placeId: input.placeId }, environment);
  const fingerprint = await fingerprintCheckoutInput(input, environment);
  if (existing) {
    return existing.fingerprint === fingerprint
      ? { status: 'reused', attempt: existing }
      : { status: 'payload-mismatch', attempt: existing };
  }

  const createdAt = (environment.now ?? Date.now)();
  const createId = environment.createId ?? (() => crypto.randomUUID());
  const idempotencyKey = idempotencyKeySchema.parse(`checkout:${createId()}`);
  const attempt = checkoutAttemptSchema.parse({
    version: CHECKOUT_ATTEMPT_VERSION,
    userId,
    placeId: input.placeId,
    input,
    idempotencyKey,
    fingerprint,
    state: CHECKOUT_ATTEMPT_STATE.READY,
    createdAt,
    expiresAt: createdAt + CHECKOUT_ATTEMPT_TTL_MS,
  });
  return { status: 'created', attempt: storeAttempt(attempt, environment.storage) };
}

export const transitionCheckoutAttempt = (
  attempt: CheckoutAttempt,
  state: CheckoutAttemptState,
  environment: CheckoutAttemptEnvironment = {},
) => storeAttempt(checkoutAttemptSchema.parse({ ...attempt, state }), environment.storage);

export const markCheckoutRecoveryChecked = (attempt: CheckoutAttempt, environment: CheckoutAttemptEnvironment = {}) =>
  storeAttempt(
    checkoutAttemptSchema.parse({ ...attempt, recoveryCheckedAt: (environment.now ?? Date.now)() }),
    environment.storage,
  );

export const clearCheckoutAttempt = (
  scope: { userId: string; placeId: string },
  environment: CheckoutAttemptEnvironment = {},
) => removeStoredAttempt(scope.userId, scope.placeId, environment.storage);

export const clearAllCheckoutAttempts = (environment: CheckoutAttemptEnvironment = {}) => {
  const storage = getStorage(environment.storage);
  if (!storage) return;
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string =>
      Boolean(key?.startsWith(`${CHECKOUT_ATTEMPT_STORAGE_PREFIX}.`)),
    );
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Storage cleanup is best effort when the browser blocks access.
  }
};
