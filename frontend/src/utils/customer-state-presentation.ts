type CustomerStatePresentation = {
  title: string;
  description: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  action: 'browse-menu' | 'review-cart' | 'refresh' | 'view-orders' | null;
  actionLabel: string | null;
};

const CUSTOMER_STATE_PRESENTATIONS = {
  closedPlace: {
    title: 'This place is closed',
    description: 'You can browse the menu, but ordering is unavailable while the place is closed.',
    tone: 'warning',
    action: 'browse-menu',
    actionLabel: 'Browse menu',
  },
  orderingDisabled: {
    title: 'Ordering is unavailable',
    description: 'This place is not accepting orders right now. Menu browsing remains available.',
    tone: 'warning',
    action: 'browse-menu',
    actionLabel: 'Browse menu',
  },
  unavailableItem: {
    title: 'Item unavailable',
    description: 'This item cannot be added right now. Choose another available menu item.',
    tone: 'warning',
    action: 'browse-menu',
    actionLabel: 'Browse menu',
  },
  reconciledCart: {
    title: 'Cart updated',
    description: 'Some cart items changed or were removed. Review the current cart before checkout.',
    tone: 'warning',
    action: 'review-cart',
    actionLabel: 'Review cart',
  },
  expiredOrder: {
    title: 'Order expired',
    description: 'This order is no longer active. Its current details remain available in your order history.',
    tone: 'info',
    action: 'view-orders',
    actionLabel: 'View orders',
  },
  unknownCheckoutOutcome: {
    title: 'Order status is uncertain',
    description: 'The order may already exist. Check your orders before starting another checkout attempt.',
    tone: 'warning',
    action: 'view-orders',
    actionLabel: 'Check your orders',
  },
} as const satisfies Record<string, CustomerStatePresentation>;

export { CUSTOMER_STATE_PRESENTATIONS, type CustomerStatePresentation };
