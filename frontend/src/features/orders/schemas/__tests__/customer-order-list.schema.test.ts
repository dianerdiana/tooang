import { describe, expect, it } from 'vitest';

import {
  compactCustomerOrderSearch,
  customerOrderSearchToListParams,
  isValidCustomerOrderPlaceId,
  normalizeCustomerOrderSearch,
  parseCustomerOrderSearch,
} from '../customer-order-list.schema';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';

describe('customer order search', () => {
  it('normalizes supported filters and pagination', () => {
    const parsed = parseCustomerOrderSearch({
      page: '2',
      limit: '50',
      status: 'READY',
      fulfillmentType: 'DINE_IN',
      placeId: placeId.toUpperCase(),
      search: 'unsupported',
    });

    expect(normalizeCustomerOrderSearch(parsed)).toEqual({
      page: 2,
      limit: 50,
      status: 'READY',
      fulfillmentType: 'DINE_IN',
      placeId,
    });
  });

  it('drops invalid values and compacts defaults from URLs', () => {
    expect(compactCustomerOrderSearch(normalizeCustomerOrderSearch(parseCustomerOrderSearch({})))).toEqual({});
    expect(parseCustomerOrderSearch({ page: '-1', limit: '500', status: 'UNKNOWN', placeId: 'nope' })).toEqual({});
  });

  it('maps exact place filtering to the own-list parameters', () => {
    const filters = normalizeCustomerOrderSearch({ page: 3, limit: 10, placeId, fulfillmentType: 'TAKEAWAY' });
    expect(customerOrderSearchToListParams(filters)).toEqual({
      page: 3,
      limit: 10,
      placeId,
      fulfillmentType: 'TAKEAWAY',
    });
    expect(isValidCustomerOrderPlaceId(placeId)).toBe(true);
    expect(isValidCustomerOrderPlaceId('not-an-id')).toBe(false);
    expect(isValidCustomerOrderPlaceId('')).toBe(true);
  });
});
