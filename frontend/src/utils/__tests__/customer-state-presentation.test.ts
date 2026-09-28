import { describe, expect, it } from 'vitest';

import { CUSTOMER_STATE_PRESENTATIONS } from '../customer-state-presentation';

describe('customer business-state presentations', () => {
  it('keeps closed and ordering-disabled states distinct while allowing browsing', () => {
    expect(CUSTOMER_STATE_PRESENTATIONS.closedPlace.title).toContain('closed');
    expect(CUSTOMER_STATE_PRESENTATIONS.orderingDisabled.title).toContain('Ordering');
    expect(CUSTOMER_STATE_PRESENTATIONS.closedPlace.action).toBe('browse-menu');
    expect(CUSTOMER_STATE_PRESENTATIONS.orderingDisabled.action).toBe('browse-menu');
  });

  it('provides deterministic recovery for item, cart, order, and checkout states', () => {
    expect(CUSTOMER_STATE_PRESENTATIONS.unavailableItem.action).toBe('browse-menu');
    expect(CUSTOMER_STATE_PRESENTATIONS.reconciledCart.action).toBe('review-cart');
    expect(CUSTOMER_STATE_PRESENTATIONS.expiredOrder.action).toBe('view-orders');
    expect(CUSTOMER_STATE_PRESENTATIONS.unknownCheckoutOutcome.action).toBe('view-orders');
    expect(CUSTOMER_STATE_PRESENTATIONS.unknownCheckoutOutcome.description).toContain('may already exist');
  });
});
