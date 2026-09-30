import { describe, expect, it } from 'vitest';

import { parseCustomerOrderDetailSearch } from '../order-detail.schema';

describe('customer order detail search', () => {
  it('accepts only the placed marker and a safe place slug', () => {
    expect(parseCustomerOrderDetailSearch({ placed: 'true', place: 'warung-kita', extra: 'ignored' })).toEqual({
      placed: true,
      place: 'warung-kita',
    });
    expect(parseCustomerOrderDetailSearch({ placed: false, place: '../admin' })).toEqual({});
    expect(parseCustomerOrderDetailSearch({ placed: 'false', place: 'UPPERCASE' })).toEqual({});
  });
});
