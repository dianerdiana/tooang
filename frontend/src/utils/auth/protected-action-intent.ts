import { z } from 'zod';

import { getSafeRedirectTarget } from './route-guard';

const INTENT_VERSION = 1 as const;
const INTENT_TTL_MS = 15 * 60 * 1000;
const INTENT_STORAGE_KEY = 'tooang.protected-action-intent.v1';
const returnToSchema = z.string().max(2048);

type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type IntentEnvironment = {
  storage?: IntentStorage | null;
  now?: () => number;
  createId?: () => string;
  origin?: string;
};

const uuidSchema = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());
const placeSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const addToCartPayloadSchema = z
  .object({
    placeId: uuidSchema,
    placeSlug: placeSlugSchema,
    menuItemId: uuidSchema,
    quantity: z.number().int().min(1).max(99),
    note: z.string().max(500).optional(),
  })
  .strict();

const placePayloadSchema = z
  .object({
    placeId: uuidSchema,
    placeSlug: placeSlugSchema,
  })
  .strict();

const ordersPayloadSchema = z.object({}).strict();
const accountPayloadSchema = z.object({ destination: z.enum(['profile', 'reviews']) }).strict();
const reviewPayloadSchema = z.discriminatedUnion('target', [
  z
    .object({
      placeId: uuidSchema,
      placeSlug: placeSlugSchema,
      target: z.literal('place'),
    })
    .strict(),
  z
    .object({
      placeId: uuidSchema,
      placeSlug: placeSlugSchema,
      target: z.literal('menu-item'),
      menuItemId: uuidSchema,
    })
    .strict(),
]);

const intentDraftSchema = z.discriminatedUnion('kind', [
  z
    .object({ kind: z.literal('add-to-cart'), payload: addToCartPayloadSchema, returnTo: returnToSchema.optional() })
    .strict(),
  z.object({ kind: z.literal('checkout'), payload: placePayloadSchema, returnTo: returnToSchema.optional() }).strict(),
  z.object({ kind: z.literal('orders'), payload: ordersPayloadSchema, returnTo: returnToSchema.optional() }).strict(),
  z.object({ kind: z.literal('account'), payload: accountPayloadSchema, returnTo: returnToSchema.optional() }).strict(),
  z.object({ kind: z.literal('review'), payload: reviewPayloadSchema, returnTo: returnToSchema.optional() }).strict(),
]);

const storedIntentSchema = z.discriminatedUnion('kind', [
  z
    .object({
      version: z.literal(INTENT_VERSION),
      id: uuidSchema,
      kind: z.literal('add-to-cart'),
      payload: addToCartPayloadSchema,
      returnTo: returnToSchema,
      createdAt: z.number().int().nonnegative(),
      expiresAt: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      version: z.literal(INTENT_VERSION),
      id: uuidSchema,
      kind: z.literal('checkout'),
      payload: placePayloadSchema,
      returnTo: returnToSchema,
      createdAt: z.number().int().nonnegative(),
      expiresAt: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      version: z.literal(INTENT_VERSION),
      id: uuidSchema,
      kind: z.literal('orders'),
      payload: ordersPayloadSchema,
      returnTo: returnToSchema,
      createdAt: z.number().int().nonnegative(),
      expiresAt: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      version: z.literal(INTENT_VERSION),
      id: uuidSchema,
      kind: z.literal('account'),
      payload: accountPayloadSchema,
      returnTo: returnToSchema,
      createdAt: z.number().int().nonnegative(),
      expiresAt: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      version: z.literal(INTENT_VERSION),
      id: uuidSchema,
      kind: z.literal('review'),
      payload: reviewPayloadSchema,
      returnTo: returnToSchema,
      createdAt: z.number().int().nonnegative(),
      expiresAt: z.number().int().positive(),
    })
    .strict(),
]);

type ProtectedActionIntentInput = z.input<typeof intentDraftSchema>;
type ProtectedActionIntent = z.output<typeof storedIntentSchema>;

type ConsumeProtectedActionIntentOptions = IntentEnvironment & {
  intentId?: string;
  currentUrl: string;
  placeId?: string;
  placeSlug?: string;
  menuItemId?: string;
};

type ConsumeProtectedActionIntentResult =
  { status: 'consumed'; intent: ProtectedActionIntent } | { status: 'missing' } | { status: 'mismatch' };

const getStorage = (storage?: IntentStorage | null) => {
  if (storage !== undefined) return storage;
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getDefaultReturnTo = (intent: z.output<typeof intentDraftSchema>) => {
  switch (intent.kind) {
    case 'add-to-cart':
      return `/places/${intent.payload.placeSlug}/menu`;
    case 'checkout':
      return `/places/${intent.payload.placeSlug}/checkout`;
    case 'orders':
    case 'review':
      return '/orders';
    case 'account':
      return `/account/${intent.payload.destination}`;
  }
};

const getPathname = (target: string, origin?: string) => {
  try {
    return new URL(target, origin ?? 'http://localhost').pathname;
  } catch {
    return null;
  }
};

const isCompatibleReturnTo = (
  intent: ProtectedActionIntent | z.output<typeof intentDraftSchema>,
  returnTo: string,
  origin?: string,
) => {
  const pathname = getPathname(returnTo, origin);
  if (!pathname) return false;

  switch (intent.kind) {
    case 'add-to-cart':
      return pathname === `/places/${intent.payload.placeSlug}/menu`;
    case 'checkout':
      return pathname === `/places/${intent.payload.placeSlug}/checkout`;
    case 'orders':
    case 'review':
      return pathname === '/orders';
    case 'account':
      return pathname === `/account/${intent.payload.destination}`;
  }
};

const removeStoredIntent = (storage?: IntentStorage | null) => {
  try {
    getStorage(storage)?.removeItem(INTENT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
};

function createProtectedActionIntent(
  input: ProtectedActionIntentInput,
  environment: IntentEnvironment = {},
): ProtectedActionIntent | null {
  const parsed = intentDraftSchema.safeParse(input);
  if (!parsed.success) return null;

  const storage = getStorage(environment.storage);
  if (!storage) return null;

  const defaultReturnTo = getDefaultReturnTo(parsed.data);
  const requestedReturnTo = parsed.data.returnTo ?? defaultReturnTo;
  const returnTo = getSafeRedirectTarget(requestedReturnTo, environment.origin);
  if (returnTo === '/' || !isCompatibleReturnTo(parsed.data, returnTo, environment.origin)) {
    return null;
  }

  const createdAt = (environment.now ?? Date.now)();
  const createId = environment.createId ?? (() => crypto.randomUUID());
  let id: string;
  try {
    id = createId();
  } catch {
    return null;
  }
  const stored = storedIntentSchema.safeParse({
    version: INTENT_VERSION,
    id,
    kind: parsed.data.kind,
    payload: parsed.data.payload,
    returnTo,
    createdAt,
    expiresAt: createdAt + INTENT_TTL_MS,
  });
  if (!stored.success) return null;

  try {
    storage.setItem(INTENT_STORAGE_KEY, JSON.stringify(stored.data));
    return stored.data;
  } catch {
    return null;
  }
}

function readProtectedActionIntent(environment: IntentEnvironment = {}): ProtectedActionIntent | null {
  const storage = getStorage(environment.storage);
  if (!storage) return null;

  try {
    const serialized = storage.getItem(INTENT_STORAGE_KEY);
    if (!serialized) return null;

    const parsed = storedIntentSchema.safeParse(JSON.parse(serialized));
    const now = (environment.now ?? Date.now)();
    if (
      !parsed.success ||
      parsed.data.expiresAt <= now ||
      parsed.data.createdAt > now ||
      parsed.data.expiresAt - parsed.data.createdAt !== INTENT_TTL_MS
    ) {
      removeStoredIntent(storage);
      return null;
    }

    const safeReturnTo = getSafeRedirectTarget(parsed.data.returnTo, environment.origin);
    if (
      safeReturnTo === '/' ||
      safeReturnTo !== parsed.data.returnTo ||
      !isCompatibleReturnTo(parsed.data, safeReturnTo, environment.origin)
    ) {
      removeStoredIntent(storage);
      return null;
    }

    return parsed.data;
  } catch {
    removeStoredIntent(storage);
    return null;
  }
}

function consumeProtectedActionIntent(
  options: ConsumeProtectedActionIntentOptions,
): ConsumeProtectedActionIntentResult {
  const intent = readProtectedActionIntent(options);
  if (!intent || (options.intentId && intent.id !== options.intentId.toLowerCase())) return { status: 'missing' };

  const currentUrl = getSafeRedirectTarget(options.currentUrl, options.origin);
  const contextMatches =
    currentUrl !== '/' &&
    getPathname(currentUrl, options.origin) === getPathname(intent.returnTo, options.origin) &&
    (!options.placeId || !('placeId' in intent.payload) || intent.payload.placeId === options.placeId.toLowerCase()) &&
    (!options.placeSlug ||
      !('placeSlug' in intent.payload) ||
      intent.payload.placeSlug === options.placeSlug.toLowerCase()) &&
    (!options.menuItemId ||
      !('menuItemId' in intent.payload) ||
      intent.payload.menuItemId === options.menuItemId.toLowerCase());

  removeStoredIntent(options.storage);
  return contextMatches ? { status: 'consumed', intent } : { status: 'mismatch' };
}

function clearProtectedActionIntent(storage?: IntentStorage | null) {
  removeStoredIntent(storage);
}

function getProtectedActionReturnTarget(
  intentId: string | undefined,
  redirectTarget: string | undefined,
  environment: IntentEnvironment = {},
) {
  const intent = readProtectedActionIntent(environment);
  if (intentId && intent?.id === intentId.toLowerCase()) return intent.returnTo;
  return getSafeRedirectTarget(redirectTarget, environment.origin);
}

export {
  clearProtectedActionIntent,
  consumeProtectedActionIntent,
  createProtectedActionIntent,
  getProtectedActionReturnTarget,
  INTENT_STORAGE_KEY,
  INTENT_TTL_MS,
  INTENT_VERSION,
  readProtectedActionIntent,
};
export type {
  ConsumeProtectedActionIntentOptions,
  ConsumeProtectedActionIntentResult,
  IntentEnvironment,
  IntentStorage,
  ProtectedActionIntent,
  ProtectedActionIntentInput,
};
