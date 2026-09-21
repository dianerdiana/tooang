import type { ApplicationError } from '@/types/api-response.type';

export const getLoginErrorMessage = (error: ApplicationError) => {
  if (error.httpStatus === 401) return 'The email or password you entered is incorrect.';
  if (error.isNetworkError) return 'Unable to reach Tooang. Check your connection and try again.';
  return error.message || 'Unable to sign in. Please try again.';
};
