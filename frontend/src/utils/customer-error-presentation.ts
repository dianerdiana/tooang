import { isApplicationError } from '@/utils/api-error.util';

type CustomerErrorKind =
  | 'validation'
  | 'authentication'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'network'
  | 'server'
  | 'unexpected';

type CustomerRecoveryAction =
  | 'adjust-input'
  | 'sign-in'
  | 'go-back'
  | 'discover'
  | 'retry'
  | 'refresh'
  | 'review-cart'
  | 'return-to-menu'
  | 'view-orders';

type CustomerErrorPresentation = {
  kind: CustomerErrorKind;
  title: string;
  description: string;
  action: CustomerRecoveryAction;
  actionLabel: string;
  tone: 'error' | 'forbidden' | 'not-found' | 'conflict';
};

const presentation = (
  kind: CustomerErrorKind,
  title: string,
  description: string,
  action: CustomerRecoveryAction,
  actionLabel: string,
  tone: CustomerErrorPresentation['tone'] = 'error',
): CustomerErrorPresentation => ({ kind, title, description, action, actionLabel, tone });

const codePresentations: Record<string, CustomerErrorPresentation> = {
  ORDER_VERIFICATION_NOT_FOUND: presentation(
    'not-found',
    'Verification unavailable',
    'This verification link is not available. Check the link or return to discovery.',
    'discover',
    'Return to discovery',
    'not-found',
  ),
  MENU_ITEM_UNAVAILABLE: presentation(
    'conflict',
    'Item unavailable',
    'This item can no longer be added. Review the current menu before continuing.',
    'return-to-menu',
    'Return to menu',
    'conflict',
  ),
  CART_ITEM_QUANTITY_LIMIT: presentation(
    'conflict',
    'Quantity limit reached',
    'Reduce this item quantity before continuing.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  CART_DISTINCT_ITEM_LIMIT: presentation(
    'conflict',
    'Cart item limit reached',
    'Remove an item from this cart before adding another one.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  CART_TOTAL_QUANTITY_LIMIT: presentation(
    'conflict',
    'Cart quantity limit reached',
    'Reduce the total quantity in this cart before continuing.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  CART_CONCURRENT_MODIFICATION: presentation(
    'conflict',
    'Cart changed',
    'The cart changed while it was being updated. Refresh it before trying again.',
    'refresh',
    'Refresh cart',
    'conflict',
  ),
  CHECKOUT_CONCURRENT_MODIFICATION: presentation(
    'conflict',
    'Cart changed during checkout',
    'Refresh the cart and review its current items before placing the order again.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  CART_EMPTY: presentation(
    'conflict',
    'Cart is empty',
    'Add an available menu item before starting checkout.',
    'return-to-menu',
    'Return to menu',
    'conflict',
  ),
  CART_ITEM_INVALID: presentation(
    'conflict',
    'Cart needs review',
    'One or more items changed and must be reviewed before checkout.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  PLACE_CLOSED: presentation(
    'conflict',
    'This place is closed',
    'Browsing remains available, but an order cannot be placed while the place is closed.',
    'return-to-menu',
    'Browse menu',
    'conflict',
  ),
  ORDERING_DISABLED: presentation(
    'conflict',
    'Ordering is unavailable',
    'This place is not accepting customer orders right now. You can continue browsing its menu.',
    'return-to-menu',
    'Browse menu',
    'conflict',
  ),
  PLACE_UNAVAILABLE: presentation(
    'not-found',
    'Place unavailable',
    'This place cannot be accessed right now. Return to discovery to choose another place.',
    'discover',
    'Return to discovery',
    'not-found',
  ),
  ORDER_TOTAL_OUT_OF_RANGE: presentation(
    'conflict',
    'Order total needs review',
    'Review the current cart quantities before trying checkout again.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  IDEMPOTENCY_KEY_REUSED: presentation(
    'conflict',
    'Checkout attempt changed',
    'Start a new checkout attempt for the updated order details.',
    'review-cart',
    'Review cart',
    'conflict',
  ),
  ORDER_PENDING_EXPIRED: presentation(
    'conflict',
    'Order expired',
    'This order expired before the requested change could be completed.',
    'view-orders',
    'View orders',
    'conflict',
  ),
  ORDER_STATUS_CHANGED: presentation(
    'conflict',
    'Order status changed',
    'Refresh the order to see its current status before continuing.',
    'refresh',
    'Refresh order',
    'conflict',
  ),
  ORDER_STATUS_TRANSITION_INVALID: presentation(
    'conflict',
    'Action no longer available',
    'The order is no longer in a state that allows this action.',
    'refresh',
    'Refresh order',
    'conflict',
  ),
};

const fallbackPresentation = presentation(
  'unexpected',
  'Something went wrong',
  'This content could not be loaded safely. Try again.',
  'retry',
  'Try again',
);

function getCustomerErrorPresentation(error: unknown): CustomerErrorPresentation {
  if (!isApplicationError(error)) return fallbackPresentation;

  const knownCode = codePresentations[error.code];
  if (knownCode) return knownCode;

  if (error.isNetworkError) {
    return presentation(
      'network',
      'Connection problem',
      'Tooang could not reach the service. Check your connection and try again.',
      'retry',
      'Try again',
    );
  }

  switch (error.httpStatus) {
    case 400:
      return presentation(
        'validation',
        'Check the information provided',
        'Some information is missing or invalid. Review the highlighted fields and try again.',
        'adjust-input',
        'Review fields',
      );
    case 401:
      return presentation(
        'authentication',
        'Sign in required',
        'Your session is no longer active. Sign in again to continue safely.',
        'sign-in',
        'Sign in',
      );
    case 403:
      return presentation(
        'forbidden',
        'Action unavailable',
        'Your account cannot access this action. Return to a page available to you.',
        'go-back',
        'Go back',
        'forbidden',
      );
    case 404:
      return presentation(
        'not-found',
        'Content unavailable',
        'This content could not be found or accessed.',
        'go-back',
        'Go back',
        'not-found',
      );
    case 409:
      return presentation(
        'conflict',
        'The information changed',
        'Refresh the latest information before trying again.',
        'refresh',
        'Refresh',
        'conflict',
      );
    case 429:
      return presentation(
        'rate-limit',
        'Too many attempts',
        'Wait a moment before trying again.',
        'retry',
        'Try again',
      );
  }

  if (error.httpStatus && error.httpStatus >= 500) {
    return presentation(
      'server',
      'Service temporarily unavailable',
      'Tooang could not complete this request. Try again shortly.',
      'retry',
      'Try again',
    );
  }

  return fallbackPresentation;
}

function getCheckoutErrorPresentation(error: unknown): CustomerErrorPresentation {
  if (isApplicationError(error) && error.isNetworkError) {
    return presentation(
      'network',
      'Order status is uncertain',
      'The order may already exist. Check your orders before starting another checkout attempt.',
      'view-orders',
      'Check your orders',
      'conflict',
    );
  }
  return getCustomerErrorPresentation(error);
}

export {
  codePresentations as customerCodePresentations,
  type CustomerErrorKind,
  type CustomerErrorPresentation,
  type CustomerRecoveryAction,
  getCheckoutErrorPresentation,
  getCustomerErrorPresentation,
};
