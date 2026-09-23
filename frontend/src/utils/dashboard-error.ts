import { isApplicationError } from '@/utils/api-error.util';

export type DashboardErrorKind = 'forbidden' | 'not-found' | 'conflict' | 'network' | 'server' | 'unexpected';

export type DashboardErrorPresentation = {
  kind: DashboardErrorKind;
  title: string;
  description: string;
  canRetry: boolean;
};

const fallbackPresentation: DashboardErrorPresentation = {
  kind: 'unexpected',
  title: 'Something went wrong',
  description: 'This content could not be loaded. Please try again.',
  canRetry: true,
};

export function getDashboardErrorPresentation(error: unknown): DashboardErrorPresentation {
  if (!isApplicationError(error)) return fallbackPresentation;

  if (error.httpStatus === 403) {
    return {
      kind: 'forbidden',
      title: 'Access no longer available',
      description: 'Your capabilities changed and you can no longer access this content.',
      canRetry: false,
    };
  }

  if (error.httpStatus === 404) {
    return {
      kind: 'not-found',
      title: 'Resource unavailable',
      description: 'This resource was removed, does not exist, or is outside your current access.',
      canRetry: false,
    };
  }

  if (error.httpStatus === 409) {
    return {
      kind: 'conflict',
      title: 'The state changed',
      description: error.message || 'This resource changed elsewhere. Refresh it before trying again.',
      canRetry: true,
    };
  }

  if (error.isNetworkError) {
    return {
      kind: 'network',
      title: 'Connection problem',
      description: 'Tooang could not reach the server. Check your connection and try again.',
      canRetry: true,
    };
  }

  if (error.httpStatus && error.httpStatus >= 500) {
    return {
      kind: 'server',
      title: 'Service temporarily unavailable',
      description: 'Tooang could not complete this request. Please try again shortly.',
      canRetry: true,
    };
  }

  return fallbackPresentation;
}

export function getSafeMutationError(error: unknown, fallback: string) {
  const presentation = getDashboardErrorPresentation(error);
  return presentation.kind === 'unexpected' ? fallback : presentation.description;
}

export function getDashboardErrorTone(kind: DashboardErrorKind): 'error' | 'forbidden' | 'not-found' | 'conflict' {
  return kind === 'forbidden' || kind === 'not-found' || kind === 'conflict' ? kind : 'error';
}
