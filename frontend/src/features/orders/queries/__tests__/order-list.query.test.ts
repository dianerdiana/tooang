import { describe, expect, it } from 'vitest';

import { orderListQueryKey, orderListQueryOptions, ownOrderListQueryOptions } from '../order-list.query';

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
});
