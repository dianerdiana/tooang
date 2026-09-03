import { redirect } from '@tanstack/react-router';

type GuardAuthContext = {
  isAuthenticated: boolean;
  isInitialLoading: boolean;
};

export const requireAuthenticated = (auth: GuardAuthContext, redirectTarget: string) => {
  if (!auth.isInitialLoading && !auth.isAuthenticated) {
    throw redirect({
      to: '/auth/login',
      search: {
        redirect: redirectTarget,
      },
      replace: true,
    });
  }
};

export const getSafeRedirectTarget = (redirectTarget?: string) => {
  if (!redirectTarget) {
    return '/dashboard';
  }

  const normalizedTarget = redirectTarget.trim();

  if (!normalizedTarget.startsWith('/') || normalizedTarget.startsWith('//')) {
    return '/dashboard';
  }

  if (/[^\x20-\x7E]/.test(normalizedTarget)) {
    return '/dashboard';
  }

  return normalizedTarget;
};
