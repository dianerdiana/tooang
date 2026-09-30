import { describe, expect, it } from 'vitest';

import {
  createReviewSchema,
  normalizeReviewModerationParams,
  parseOwnReviewSearch,
  parseReviewModerationSearch,
  reviewUpdateSchema,
} from '../reviews.schema';

const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';
const itemId = '6D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';

describe('review moderation search', () => {
  it('defaults to unfiltered place reviews and normalizes documented values', () => {
    expect(parseReviewModerationSearch({})).toEqual({ tab: 'place', page: 1, limit: 20 });
    expect(
      parseReviewModerationSearch({ tab: 'menu-item', page: '2', limit: '50', placeId, menuItemId: itemId }),
    ).toEqual({
      tab: 'menu-item',
      page: 2,
      limit: 50,
      placeId: placeId.toLowerCase(),
      menuItemId: itemId.toLowerCase(),
    });
  });

  it('strips item context from place tabs and rejects unsupported values safely', () => {
    expect(
      parseReviewModerationSearch({ tab: 'place', page: -1, limit: 200, menuItemId: itemId, ignored: true }),
    ).toEqual({ tab: 'place', page: 1, limit: 20 });
  });

  it('normalizes API parameters independently of route tabs', () => {
    expect(normalizeReviewModerationParams({ page: 2, limit: 10, placeId, menuItemId: itemId })).toEqual({
      page: 2,
      limit: 10,
      placeId: placeId.toLowerCase(),
      menuItemId: itemId.toLowerCase(),
    });
  });
});

describe('customer review schemas', () => {
  const orderId = '123e4567-e89b-42d3-a456-426614174000';

  it('normalizes create input and counts Unicode code points', () => {
    expect(createReviewSchema.parse({ orderId: orderId.toUpperCase(), rating: 5, comment: '  cafe\u0301  ' })).toEqual({
      orderId,
      rating: 5,
      comment: 'café',
    });
    expect(createReviewSchema.parse({ orderId, rating: 4, comment: '   ' }).comment).toBeNull();
    expect(createReviewSchema.parse({ orderId, rating: 4 }).comment).toBeUndefined();
    expect(createReviewSchema.safeParse({ orderId, rating: 5, comment: '🙂'.repeat(2000) }).success).toBe(true);
    expect(createReviewSchema.safeParse({ orderId, rating: 5, comment: '🙂'.repeat(2001) }).success).toBe(false);
  });

  it('rejects invalid ratings, extra identity claims, and empty updates', () => {
    expect(createReviewSchema.safeParse({ orderId, rating: 4.5 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ orderId, rating: 6 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ orderId, rating: 4, userId: 'spoofed' }).success).toBe(false);
    expect(reviewUpdateSchema.safeParse({}).success).toBe(false);
    expect(reviewUpdateSchema.parse({ comment: '  updated  ' })).toEqual({ comment: 'updated' });
  });

  it('normalizes own-review URL state independently from moderation filters', () => {
    expect(parseOwnReviewSearch({ tab: 'menu-item', page: '2', limit: '50', placeId })).toEqual({
      tab: 'menu-item',
      page: 2,
      limit: 50,
    });
  });
});
