const PUBLIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isPublicPlaceSlug = (value: string) => value.length <= 100 && PUBLIC_SLUG_PATTERN.test(value);

export const isVerificationToken = (value: string) => VERIFICATION_TOKEN_PATTERN.test(value);

export const isOrderId = (value: string) => UUID_PATTERN.test(value);
