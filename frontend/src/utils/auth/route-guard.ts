const DEFAULT_REDIRECT_TARGET = '/';

const DEFAULT_REDIRECT_ORIGIN = 'http://localhost';

const getRedirectOrigin = (origin?: string) => {
  if (origin) return origin;
  return typeof window === 'undefined' ? DEFAULT_REDIRECT_ORIGIN : window.location.origin;
};

export const getSafeRedirectTarget = (redirectTarget?: string, origin?: string) => {
  if (!redirectTarget) return DEFAULT_REDIRECT_TARGET;

  const normalizedTarget = redirectTarget.trim();
  if (!normalizedTarget.startsWith('/') || normalizedTarget.startsWith('//')) return DEFAULT_REDIRECT_TARGET;
  if (normalizedTarget.includes('\\') || /[^\x20-\x7E]/.test(normalizedTarget)) return DEFAULT_REDIRECT_TARGET;

  const path = normalizedTarget.split(/[?#]/, 1)[0] ?? '';
  if (/%(?:2f|5c)/i.test(path)) return DEFAULT_REDIRECT_TARGET;
  try {
    const decodedPath = decodeURIComponent(path);
    if (
      decodedPath.includes('\\') ||
      Array.from(decodedPath).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint < 32 || codePoint === 127;
      })
    ) {
      return DEFAULT_REDIRECT_TARGET;
    }
  } catch {
    return DEFAULT_REDIRECT_TARGET;
  }

  try {
    const base = new URL(getRedirectOrigin(origin));
    const target = new URL(normalizedTarget, base);
    if (target.origin !== base.origin || target.username || target.password) return DEFAULT_REDIRECT_TARGET;

    const localTarget = `${target.pathname}${target.search}${target.hash}`;
    if (!localTarget.startsWith('/') || localTarget.startsWith('//')) return DEFAULT_REDIRECT_TARGET;
    return localTarget;
  } catch {
    return DEFAULT_REDIRECT_TARGET;
  }
};
