import { describe, expect, it } from 'vitest';

import { orderDetailKeys, orderDetailQueryKey, placeOrderDetailQueryOptions } from './order-detail.query';
import { placeOrderListKey, platformOrderListKey } from './order-transition.mutation';

describe('operational order detail query keys', () => {
  it('isolates order details by place and order', () => {
    expect(orderDetailKeys.placeOrder('place-a', 'order-1')).toEqual([
      'orders',
      'detail',
      'place',
      'place-a',
      'order-1',
    ]);
    expect(orderDetailKeys.placeOrder('place-a', 'order-1')).not.toEqual(
      orderDetailKeys.placeOrder('place-b', 'order-1'),
    );
  });

  it('disables detail retrieval without a selected order', () => {
    expect(placeOrderDetailQueryOptions('place-a', null).enabled).toBe(false);
    expect(placeOrderDetailQueryOptions('place-a', 'order-1').enabled).toBe(true);
  });

  it('keeps platform detail keys separate from place detail keys', () => {
    expect(orderDetailQueryKey({ kind: 'platform' }, 'order-1')).toEqual(['orders', 'detail', 'platform', 'order-1']);
    expect(orderDetailQueryKey({ kind: 'platform' }, 'order-1')).not.toEqual(
      orderDetailQueryKey({ kind: 'place', placeId: 'place-a' }, 'order-1'),
    );
  });

  it('targets every list variant for one place when refreshing', () => {
    expect(placeOrderListKey('place-a')).toEqual(['orders', 'list', 'place', 'place-a']);
    expect(platformOrderListKey()).toEqual(['orders', 'list', 'platform']);
  });
});
