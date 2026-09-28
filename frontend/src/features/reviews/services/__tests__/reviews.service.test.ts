import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
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
