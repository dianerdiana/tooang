import { describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { normalizePublicPlaceReviewListParams, normalizePublicReviewPlaceId } from '../../schemas/reviews.schema';
import { invalidateModerationReviews, invalidatePublicPlaceReviews } from '../reviews.mutation';
import {
  moderationReviewKeys,
  publicMenuItemReviewKeys,
  publicMenuItemReviewsInfiniteQueryOptions,
  publicPlaceReviewKeys,
  publicPlaceReviewsInfiniteQueryOptions,
} from '../reviews.query';

describe('review moderation queries', () => {
  it('isolates type, page, and context filters in list keys', () => {
    const place = moderationReviewKeys.list('place', { page: 1, limit: 20 });
    const item = moderationReviewKeys.list('menu-item', { page: 1, limit: 20 });
    const filtered = moderationReviewKeys.list('place', {
      page: 1,
      limit: 20,
      placeId: '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae',
    });
    expect(place).not.toEqual(item);
    expect(place).not.toEqual(filtered);
  });

  it('invalidates the complete moderation namespace after deletion', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
    await invalidateModerationReviews(client);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reviews', 'moderation'] });
  });
});

describe('public place review queries', () => {
  const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
  const otherPlaceId = '8f95e179-a74f-46e0-aea8-e796a297c667';

  it('normalizes UUID, page, and limit with backend defaults and bounds', () => {
    expect(normalizePublicReviewPlaceId(` ${placeId.toUpperCase()} `)).toBe(placeId);
    expect(normalizePublicPlaceReviewListParams({})).toEqual({ page: 1, limit: 20 });
    expect(normalizePublicPlaceReviewListParams({ page: '3' as unknown as number, limit: 100 })).toEqual({
      page: 3,
      limit: 100,
    });
    expect(normalizePublicPlaceReviewListParams({ page: 0, limit: 101 })).toEqual({ page: 1, limit: 20 });
    expect(() => normalizePublicReviewPlaceId('not-a-uuid')).toThrow();
  });

  it('puts the place before pagination and isolates all cache variants', () => {
    const first = publicPlaceReviewKeys.list(placeId, { page: 1, limit: 10 });
    const second = publicPlaceReviewKeys.list(placeId, { page: 2, limit: 10 });
    const otherPlace = publicPlaceReviewKeys.list(otherPlaceId, { page: 1, limit: 10 });
    const infinite = publicPlaceReviewKeys.infinite(placeId, 10);

    expect(first.slice(0, 4)).toEqual(['reviews', 'public', 'place', placeId]);
    expect(first).not.toEqual(second);
    expect(first).not.toEqual(otherPlace);
    expect(first).not.toEqual(infinite);
  });

  it('derives the next page only from returned metadata', () => {
    const getNextPageParam = publicPlaceReviewsInfiniteQueryOptions(placeId, 10).getNextPageParam;
    const result = {
      reviews: [],
      summary: { reviewCount: 21, averageRating: 4.25 },
      meta: { page: 1, limit: 10, totalItems: 21, totalPages: 3 },
    };

    expect(getNextPageParam?.(result, [result], 1, [1])).toBe(2);
    expect(
      getNextPageParam?.({ ...result, meta: { ...result.meta, page: 3 } }, [result], 3, [1, 2, 3]),
    ).toBeUndefined();
  });

  it('invalidates only the requested public place namespace', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();

    await invalidatePublicPlaceReviews(client, placeId);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reviews', 'public', 'place', placeId] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['reviews', 'own'] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['reviews', 'moderation'] });
  });
});

describe('public menu-item review queries', () => {
  const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
  const itemId = '8f95e179-a74f-46e0-aea8-e796a297c667';
  const otherItemId = '123e4567-e89b-12d3-a456-426614174000';

  it('isolates place, item, numbered, infinite, and place-review caches', () => {
    const first = publicMenuItemReviewKeys.list(placeId, itemId, { page: 1, limit: 10 });
    const next = publicMenuItemReviewKeys.list(placeId, itemId, { page: 2, limit: 10 });
    const other = publicMenuItemReviewKeys.list(placeId, otherItemId, { page: 1, limit: 10 });
    const infinite = publicMenuItemReviewKeys.infinite(placeId, itemId, 10);

    expect(first.slice(0, 7)).toEqual(['reviews', 'public', 'menu-item', 'place', placeId, 'item', itemId]);
    expect(first).not.toEqual(next);
    expect(first).not.toEqual(other);
    expect(first).not.toEqual(infinite);
    expect(first).not.toEqual(publicPlaceReviewKeys.list(placeId, { page: 1, limit: 10 }));
  });

  it('stops progressive item reviews from returned metadata', () => {
    const options = publicMenuItemReviewsInfiniteQueryOptions(placeId, itemId, 10);
    const page = {
      reviews: [],
      summary: { reviewCount: 11, averageRating: 4.5 },
      meta: { page: 1, limit: 10, totalItems: 11, totalPages: 2 },
    };
    expect(options.getNextPageParam?.(page, [page], 1, [1])).toBe(2);
    expect(options.getNextPageParam?.({ ...page, meta: { ...page.meta, page: 2 } }, [page], 2, [1, 2])).toBeUndefined();
  });
});
