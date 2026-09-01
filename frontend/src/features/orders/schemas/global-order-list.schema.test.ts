import { describe, expect, it } from 'vitest';

import { isValidOrderPlaceId, parseGlobalOrderSearch, toGlobalOrderListParams } from './global-order-list.schema';

const placeId = '00000000-0000-4000-8000-000000000001';

describe('global order search', () => {
  it('parses documented filters using a route-safe place alias', () => {
    expect(
      parseGlobalOrderSearch({
        page: '2',
        limit: '50',
        status: 'READY',
        fulfillmentType: 'TAKEAWAY',
        orderPlaceId: ` ${placeId} `,
        placeId: 'membership-context-must-not-be-used',
      }),
    ).toEqual({ page: 2, limit: 50, status: 'READY', fulfillmentType: 'TAKEAWAY', orderPlaceId: placeId });
  });

  it('falls back safely for unsupported filters and invalid values', () => {
    expect(
      parseGlobalOrderSearch({
        page: 0,
        limit: 101,
        status: 'REFUNDED',
        fulfillmentType: 'DELIVERY',
        orderPlaceId: 'x',
      }),
    ).toEqual({ page: 1, limit: 20 });
  });

  it('validates place UUID input before applying it', () => {
    expect(isValidOrderPlaceId('')).toBe(true);
    expect(isValidOrderPlaceId(placeId)).toBe(true);
    expect(isValidOrderPlaceId('not-a-uuid')).toBe(false);
  });

  it('maps the route alias to the documented API placeId parameter', () => {
    expect(toGlobalOrderListParams({ page: 1, limit: 20, orderPlaceId: placeId })).toEqual({
      page: 1,
      limit: 20,
      placeId,
    });
  });
});
