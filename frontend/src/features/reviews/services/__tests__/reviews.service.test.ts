import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { reviewsService } from '../reviews.service';

const listResponse = {
  data: {
    error: false,
    message: 'Reviews retrieved',
    data: { reviews: [] },
    meta: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
  },
};

describe('reviewsService moderation', () => {
  beforeEach(() => {
    apiMock.get.mockReset();
    apiMock.delete.mockReset();
    apiMock.patch.mockReset();
    apiMock.get.mockResolvedValue(listResponse);
  });

  it('uses separate documented list routes with normalized filters', async () => {
    await reviewsService.listPlaceReviews({ page: 1, limit: 20, placeId: 'invalid' });
    await reviewsService.listMenuItemReviews({ page: 2, limit: 50 });

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/place-reviews', {
      params: { page: 1, limit: 20 },
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/menu-item-reviews', {
      params: { page: 2, limit: 50 },
    });
  });

  it('uses distinct moderation delete routes without bodies', async () => {
    const result = { reviewId: 'review-id', deletedAt: '2026-09-23T00:00:00.000Z' };
    apiMock.delete.mockResolvedValue({
      data: { error: false, message: 'Review moderated', data: { review: result } },
    });

    await expect(reviewsService.moderatePlaceReview('review-id')).resolves.toEqual(result);
    await expect(reviewsService.moderateMenuItemReview('review-id')).resolves.toEqual(result);
    expect(apiMock.delete).toHaveBeenNthCalledWith(1, '/place-reviews/review-id');
    expect(apiMock.delete).toHaveBeenNthCalledWith(2, '/menu-item-reviews/review-id');
  });

  it('uses actor-scoped list and mutation routes for personal reviews', async () => {
    apiMock.patch.mockResolvedValueOnce({ data: { error: false, message: 'Updated', data: { review: {} } } });
    apiMock.delete.mockResolvedValueOnce({ data: { error: false, message: 'Deleted', data: { review: {} } } });
    await reviewsService.listOwnPlaceReviews({ page: 1, limit: 20 });
    await reviewsService.listOwnMenuItemReviews({ page: 2, limit: 10 });
    await reviewsService.updateOwnReview('place', 'review/1', { rating: 4, comment: 'Updated' });
    await reviewsService.deleteOwnReview('menu-item', 'review/2');
    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/me/place-reviews', { params: { page: 1, limit: 20 } });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/me/menu-item-reviews', { params: { page: 2, limit: 10 } });
    expect(apiMock.patch).toHaveBeenCalledWith('/me/place-reviews/review%2F1', { rating: 4, comment: 'Updated' });
    expect(apiMock.delete).toHaveBeenCalledWith('/me/menu-item-reviews/review%2F2');
  });

  it('normalizes backend moderation errors', async () => {
    apiMock.delete.mockRejectedValueOnce({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    await expect(reviewsService.moderatePlaceReview('review-id')).rejects.toMatchObject({
      message: 'Forbidden',
      code: 'FORBIDDEN',
      isNetworkError: false,
    });
  });
});

describe('reviewsService public place reviews', () => {
  const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';

  beforeEach(() => {
    apiMock.get.mockReset();
  });

  it('uses the public endpoint and preserves summary precision and pagination', async () => {
    const response = {
      reviews: [
        {
          reviewId: 'review-public-1',
          rating: 4,
          comment: 'Worth another visit.',
          reviewer: { userId: 'user-public-1', fullName: 'Public Guest' },
          createdAt: '2026-09-27T10:00:00.000Z',
          updatedAt: '2026-09-27T10:00:00.000Z',
        },
      ],
      summary: { reviewCount: 3, averageRating: 4.333333333333333 },
    };
    const meta = { page: 2, limit: 10, totalItems: 3, totalPages: 2 };
    apiMock.get.mockResolvedValueOnce({ data: { error: false, message: 'Reviews retrieved', data: response, meta } });

    await expect(
      reviewsService.listPublicPlaceReviews(placeId, { page: '2' as unknown as number, limit: 10 }),
    ).resolves.toEqual({ ...response, meta });
    expect(apiMock.get).toHaveBeenCalledWith('/places/5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae/reviews', {
      params: { page: 2, limit: 10 },
    });
  });

  it('keeps an empty result and nullable average intact', async () => {
    const response = { reviews: [], summary: { reviewCount: 0, averageRating: null } };
    const meta = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
    apiMock.get.mockResolvedValueOnce({ data: { error: false, message: 'No reviews', data: response, meta } });

    await expect(reviewsService.listPublicPlaceReviews(placeId, {})).resolves.toEqual({ ...response, meta });
  });

  it('converts public review request errors', async () => {
    apiMock.get.mockRejectedValueOnce({ error: true, message: 'Place unavailable', code: 'NOT_FOUND' });

    await expect(reviewsService.listPublicPlaceReviews(placeId, {})).rejects.toMatchObject({
      message: 'Place unavailable',
      code: 'NOT_FOUND',
      isNetworkError: false,
    });
  });
});

describe('reviewsService review creation', () => {
  const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';
  const itemId = '8F95E179-A74F-46E0-AEA8-E796A297C667';
  const input = { orderId: '123e4567-e89b-42d3-a456-426614174000', rating: 5, comment: 'Excellent' };
  const review = {
    reviewId: 'review-1',
    rating: 5,
    comment: 'Excellent',
    reviewer: { userId: 'user-1', fullName: 'Ayu' },
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  };

  beforeEach(() => apiMock.post.mockReset());

  it('posts exact place and item targets and distinguishes create from restore status', async () => {
    apiMock.post
      .mockResolvedValueOnce({ status: 201, data: { error: false, message: 'Created', data: { review } } })
      .mockResolvedValueOnce({ status: 200, data: { error: false, message: 'Restored', data: { review } } });

    await expect(reviewsService.createPlaceReview(placeId, input)).resolves.toEqual({ review, outcome: 'created' });
    await expect(reviewsService.createMenuItemReview(placeId, itemId, input)).resolves.toEqual({
      review,
      outcome: 'restored',
    });
    expect(apiMock.post).toHaveBeenNthCalledWith(1, '/places/5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae/reviews', input);
    expect(apiMock.post).toHaveBeenNthCalledWith(
      2,
      '/places/5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae/menu-items/8f95e179-a74f-46e0-aea8-e796a297c667/reviews',
      input,
    );
  });

  it('normalizes create errors', async () => {
    apiMock.post.mockRejectedValueOnce({
      error: true,
      message: 'Already exists',
      code: 'REVIEW_ALREADY_EXISTS',
    });
    await expect(reviewsService.createPlaceReview(placeId, input)).rejects.toMatchObject({
      code: 'REVIEW_ALREADY_EXISTS',
      isNetworkError: false,
    });
  });
});

describe('reviewsService public menu-item reviews', () => {
  const placeId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';
  const menuItemId = '8F95E179-A74F-46E0-AEA8-E796A297C667';

  beforeEach(() => apiMock.get.mockReset());

  it('uses the exact public item endpoint and preserves its safe response', async () => {
    const data = {
      reviews: [
        {
          reviewId: 'review-1',
          rating: 5,
          comment: 'Excellent',
          reviewer: { userId: 'public-user-1', fullName: 'A Guest' },
          createdAt: '2026-09-28T00:00:00.000Z',
          updatedAt: '2026-09-28T00:00:00.000Z',
        },
      ],
      summary: { reviewCount: 1, averageRating: 5 },
    };
    const meta = { page: 1, limit: 10, totalItems: 1, totalPages: 1 };
    apiMock.get.mockResolvedValueOnce({ data: { error: false, message: 'Reviews retrieved', data, meta } });

    await expect(
      reviewsService.listPublicMenuItemReviews(placeId, menuItemId, { page: 1, limit: 10 }),
    ).resolves.toEqual({ ...data, meta });
    expect(apiMock.get).toHaveBeenCalledWith(
      '/places/5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae/menu-items/8f95e179-a74f-46e0-aea8-e796a297c667/reviews',
      { params: { page: 1, limit: 10 } },
    );
  });

  it('preserves nullable empty item-review summaries and converts errors', async () => {
    const meta = { page: 1, limit: 20, totalItems: 0, totalPages: 0 };
    apiMock.get.mockResolvedValueOnce({
      data: {
        error: false,
        message: 'No reviews',
        data: { reviews: [], summary: { reviewCount: 0, averageRating: null } },
        meta,
      },
    });
    await expect(reviewsService.listPublicMenuItemReviews(placeId, menuItemId, {})).resolves.toEqual({
      reviews: [],
      summary: { reviewCount: 0, averageRating: null },
      meta,
    });

    apiMock.get.mockRejectedValueOnce({ error: true, message: 'Item unavailable', code: 'NOT_FOUND' });
    await expect(reviewsService.listPublicMenuItemReviews(placeId, menuItemId, {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
      isNetworkError: false,
    });
  });
});
