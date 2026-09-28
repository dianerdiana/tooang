import type { ApplicationError } from '@/types/api-response.type';

const formatRetryDelay = (seconds: number) => {
  if (seconds < 60) return `${Math.max(1, seconds)} ${seconds === 1 ? 'second' : 'seconds'}`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
};

const getRateLimitMessage = (action: 'sign-in' | 'registration', retryAfterSeconds?: number) => {
  const label = action === 'sign-in' ? 'sign-in' : 'registration';

  if (retryAfterSeconds === undefined) {
    return `Too many ${label} attempts. Wait a moment and try again.`;
  }

  return `Too many ${label} attempts. Try again in ${formatRetryDelay(retryAfterSeconds)}.`;
};

export const getLoginErrorMessage = (error: ApplicationError) => {
  if (error.httpStatus === 401) return 'The email or password you entered is incorrect.';
  if (error.httpStatus === 429) return getRateLimitMessage('sign-in', error.retryAfterSeconds);
  if (error.isNetworkError) return 'Unable to reach Tooang. Check your connection and try again.';
  return 'Unable to sign in. Please try again.';
};

type RegisterErrorPresentation = {
  message: string;
  field?: 'email' | 'password';
};

export const getRegisterErrorPresentation = (error: ApplicationError): RegisterErrorPresentation => {
  if (error.code === 'COMMON_PASSWORD') {
    return { message: 'Choose a less common password and try again.', field: 'password' };
  }
  if (error.httpStatus === 409) {
    return { message: 'An account with this email already exists.', field: 'email' };
  }
  if (error.httpStatus === 429) {
    return { message: getRateLimitMessage('registration', error.retryAfterSeconds) };
  }
  if (error.isNetworkError) {
    return { message: 'Unable to reach Tooang. Check your connection and try again.' };
  }

  return { message: 'Unable to create your account. Check your details and try again.' };
};
