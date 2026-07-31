import { describe, expect, it } from 'vitest';

import { parseOrderQueueSearch } from './order-list.schema';

describe('order queue search', () => {
  it('applies documented pagination defaults and preserves the selected place', () => {
    expect(parseOrderQueueSearch({ placeId: ' place-1 ' })).toEqual({
      placeId: 'place-1',
      page: 1,
      limit: 20,
    });
  });

  it('accepts documented filters and numeric URL values', () => {
    expect(
      parseOrderQueueSearch({
        placeId: 'place-1',
        page: '3',
        limit: '50',
        status: 'READY',
        fulfillmentType: 'DINE_IN',
      }),
    ).toEqual({
      placeId: 'place-1',
      page: 3,
      limit: 50,
      status: 'READY',
      fulfillmentType: 'DINE_IN',
    });
  });

  it('falls back safely for invalid and unsupported values', () => {
    expect(
      parseOrderQueueSearch({
        page: '-2',
        limit: '101',
        status: 'REFUNDED',
        fulfillmentType: 'DELIVERY',
        search: 'unsupported',
      }),
    ).toEqual({ page: 1, limit: 20 });
  });
});
