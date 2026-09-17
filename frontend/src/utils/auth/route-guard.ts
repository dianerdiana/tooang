const DEFAULT_REDIRECT_TARGET = '/';

export const getSafeRedirectTarget = (redirectTarget?: string) => {
  if (!redirectTarget) return DEFAULT_REDIRECT_TARGET;

  const normalizedTarget = redirectTarget.trim();
  if (!normalizedTarget.startsWith('/') || normalizedTarget.startsWith('//')) return DEFAULT_REDIRECT_TARGET;
  if (/[^\x20-\x7E]/.test(normalizedTarget)) return DEFAULT_REDIRECT_TARGET;

  return normalizedTarget;
};
