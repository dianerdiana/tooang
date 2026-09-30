import { describe, expect, it, vi } from 'vitest';

import { ordersService } from '../../services/orders.service';
import {
  ORDER_REFRESH_INTERVAL,
  orderListQueryKey,
  orderListQueryOptions,
  ownOrderListQueryOptions,
  shouldPollOrderList,
} from '../order-list.query';

describe('order list queries', () => {
  it('separates place caches by place and status', () => {
    expect(orderListQueryKey({ kind: 'place', placeId: 'place-a' }, { limit: 1, status: 'READY' })).toEqual([
      'orders',
      'list',
      'place',
      'place-a',
      { page: 1, limit: 1, status: 'READY' },
    ]);
    expect(orderListQueryKey({ kind: 'place', placeId: 'place-b' }, { limit: 1, status: 'READY' })).not.toEqual(
      orderListQueryKey({ kind: 'place', placeId: 'place-a' }, { limit: 1, status: 'READY' }),
    );
  });

  it('uses a distinct global cache and disables queries without an authorized scope', () => {
    expect(orderListQueryKey({ kind: 'platform' }, { limit: 5 })).toEqual([
      'orders',
      'list',
      'platform',
      null,
      { page: 1, limit: 5 },
    ]);
    expect(orderListQueryOptions(null, { limit: 5 }).enabled).toBe(false);
  });

  it('includes place filters for own and platform lists but not place-operational lists', () => {
    expect(ownOrderListQueryOptions({ limit: 5, placeId: 'place-a' }).queryKey).toEqual([
      'orders',
      'list',
      'own',
      null,
      { page: 1, limit: 5, placeId: 'place-a' },
    ]);
    expect(orderListQueryKey({ kind: 'platform' }, { placeId: 'place-a' })).toContainEqual({
      page: 1,
      limit: 20,
      placeId: 'place-a',
    });
    expect(orderListQueryKey({ kind: 'place', placeId: 'place-a' }, { placeId: 'place-b' })).toContainEqual({
      page: 1,
      limit: 20,
    });
  });

  it('sends the normalized own place filter to the service', async () => {
    const list = vi.spyOn(ordersService, 'list').mockResolvedValue({
      orders: [],
      meta: { page: 2, limit: 10, totalItems: 0, totalPages: 0 },
    });
    const options = ownOrderListQueryOptions({
      page: 2,
      limit: 10,
      placeId: 'place-a',
      status: 'READY',
      fulfillmentType: 'TAKEAWAY',
    });

    await options.queryFn?.({} as never);

    expect(list).toHaveBeenCalledWith(
      { kind: 'own' },
      { page: 2, limit: 10, placeId: 'place-a', status: 'READY', fulfillmentType: 'TAKEAWAY' },
    );
  });

  it('polls unfiltered and active queues but not terminal-only history', () => {
    expect(shouldPollOrderList({})).toBe(true);
    expect(shouldPollOrderList({ status: 'PENDING' })).toBe(true);
    expect(shouldPollOrderList({ status: 'READY' })).toBe(true);
    expect(shouldPollOrderList({ status: 'COMPLETED' })).toBe(false);
    expect(orderListQueryOptions({ kind: 'platform' }, {}).refetchInterval).toBe(ORDER_REFRESH_INTERVAL);
    expect(orderListQueryOptions({ kind: 'place', placeId: 'place-a' }, { status: 'CANCELLED' }).refetchInterval).toBe(
      false,
    );
    expect(ownOrderListQueryOptions({ status: 'EXPIRED' }).refetchOnWindowFocus).toBe(false);
  });
});
