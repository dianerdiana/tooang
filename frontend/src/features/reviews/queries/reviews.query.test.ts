import { describe, expect, it, vi } from 'vitest';

import { QueryClient } from '@tanstack/react-query';

import { invalidateModerationReviews } from './reviews.mutation';
import { moderationReviewKeys } from './reviews.query';

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
