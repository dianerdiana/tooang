import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { ReviewsService } from './reviews.service';

const now = new Date('2026-09-15T00:00:00.000Z');
const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: 'USER' as const };
const review = {
  id: 'review-id',
  rating: 5,
  comment: 'Excellent',
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  user: { userId: actor.userId, fullName: 'Actor' },
};

function setup(overrides: Record<string, unknown> = {}) {
  const repository = {
    lockActiveActor: jest.fn<() => Promise<unknown>>().mockResolvedValue(actor),
    lockOwnedOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue({
      id: 'order-id',
      placeId: 'place-id',
      status: 'COMPLETED',
    }),
    findReviewablePlace: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'place-id' }),
    findReviewableMenuItem: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'item-id' }),
    orderContainsMenuItem: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'line-id' }),
    findStoredPlaceReviewByOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    findStoredMenuItemReview: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    createPlaceReview: jest.fn<() => Promise<unknown>>().mockResolvedValue(review),
    restorePlaceReview: jest.fn<() => Promise<unknown>>().mockResolvedValue(review),
    createMenuItemReview: jest.fn<() => Promise<unknown>>().mockResolvedValue(review),
    restoreMenuItemReview: jest.fn<() => Promise<unknown>>().mockResolvedValue(review),
    findActivePlaceReviewForModeration: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ id: review.id }),
    findActiveMenuItemReviewForModeration: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ id: review.id }),
    moderatePlaceReview: jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 1 }),
    moderateMenuItemReview: jest.fn<() => Promise<unknown>>().mockResolvedValue({ count: 1 }),
    listPlaceReviewsForModeration: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ reviews: [], totalItems: 0 }),
    listMenuItemReviewsForModeration: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({ reviews: [], totalItems: 0 }),
    ...overrides,
  };
  const prisma = { $transaction: jest.fn((callback: (tx: object) => unknown) => callback({})) };
  const audit = { append: jest.fn<() => Promise<unknown>>().mockResolvedValue({}) };
  return {
    service: new ReviewsService(prisma as never, repository as never, audit as never),
    repository,
    audit,
  };
}

describe('ReviewsService', () => {
  it('returns safe contextual place reviews for moderation', async () => {
    const contextualReview = {
      ...review,
      place: { id: 'place-id', name: 'Review Cafe' },
    };
    const { service, repository } = setup({
      listPlaceReviewsForModeration: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ reviews: [contextualReview], totalItems: 21 }),
    });

    await expect(service.listPlaceReviewsForModeration({ page: 2, limit: 20 })).resolves.toEqual({
      reviews: [
        expect.objectContaining({
          reviewId: review.id,
          reviewer: review.user,
          place: { placeId: 'place-id', name: 'Review Cafe' },
        }),
      ],
      meta: { page: 2, limit: 20, totalItems: 21, totalPages: 2 },
    });
    expect(repository.listPlaceReviewsForModeration).toHaveBeenCalledWith(2, 20, undefined);
  });

  it('returns safe place and menu context for menu-item moderation', async () => {
    const contextualReview = {
      ...review,
      menuItem: {
        id: 'item-id',
        name: 'Reviewed item',
        place: { id: 'place-id', name: 'Review Cafe' },
      },
    };
    const { service, repository } = setup({
      listMenuItemReviewsForModeration: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ reviews: [contextualReview], totalItems: 1 }),
    });

    const result = await service.listMenuItemReviewsForModeration({
      page: 1,
      limit: 20,
      placeId: 'place-id',
      menuItemId: 'item-id',
    });
    expect(result.reviews[0]).toMatchObject({
      place: { placeId: 'place-id', name: 'Review Cafe' },
      menuItem: { menuItemId: 'item-id', name: 'Reviewed item' },
    });
    expect(repository.listMenuItemReviewsForModeration).toHaveBeenCalledWith(1, 20, {
      placeId: 'place-id',
      menuItemId: 'item-id',
    });
  });

  it('creates a place review from an owned completed order', async () => {
    const { service, repository } = setup();
    const result = await service.createPlaceReview(actor, 'place-id', {
      orderId: 'order-id',
      rating: 5,
      comment: 'Excellent',
    });
    expect(result.created).toBe(true);
    expect(repository.createPlaceReview).toHaveBeenCalledWith(
      actor.id,
      'place-id',
      'order-id',
      { rating: 5, comment: 'Excellent' },
      expect.anything(),
    );
  });

  it('restores a deleted place review instead of inserting', async () => {
    const deleted = { ...review, deletedAt: now };
    const { service, repository } = setup({
      findStoredPlaceReviewByOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue(deleted),
    });
    const result = await service.createPlaceReview(actor, 'place-id', {
      orderId: 'order-id',
      rating: 4,
    });
    expect(result.created).toBe(false);
    expect(repository.restorePlaceReview).toHaveBeenCalled();
    expect(repository.createPlaceReview).not.toHaveBeenCalled();
  });

  it('rejects active duplicates and non-completed orders', async () => {
    const duplicate = setup({
      findStoredPlaceReviewByOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue(review),
    });
    await expect(
      duplicate.service.createPlaceReview(actor, 'place-id', { orderId: 'order-id', rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);

    const pending = setup({
      lockOwnedOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'order-id',
        placeId: 'place-id',
        status: 'PENDING',
      }),
    });
    await expect(
      pending.service.createPlaceReview(actor, 'place-id', { orderId: 'order-id', rating: 4 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a matching order snapshot for a menu-item review', async () => {
    const { service } = setup({
      orderContainsMenuItem: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    });
    await expect(
      service.createMenuItemReview(actor, 'place-id', 'item-id', {
        orderId: 'order-id',
        rating: 4,
      }),
    ).rejects.toMatchObject({ response: { code: 'REVIEW_ITEM_NOT_IN_ORDER' } });
  });

  it('hides an order owned by another user', async () => {
    const { service } = setup({
      lockOwnedOrder: jest.fn<() => Promise<unknown>>().mockResolvedValue(null),
    });
    await expect(
      service.createPlaceReview(actor, 'place-id', { orderId: 'order-id', rating: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechecks global moderation permission and audits atomically', async () => {
    const admin = { ...actor, platformRole: 'ADMIN' as const };
    const { service, audit } = setup({
      lockActiveActor: jest.fn<() => Promise<unknown>>().mockResolvedValue(admin),
    });
    await service.moderatePlaceReview(admin, review.id);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REVIEW_MODERATED',
        targetType: 'PlaceReview',
        beforeData: { deletedAt: null },
      }),
      expect.anything(),
    );
  });

  it('denies moderation after an administrator is demoted', async () => {
    const { service, audit } = setup();
    await expect(
      service.moderatePlaceReview({ ...actor, platformRole: 'ADMIN' }, review.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.append).not.toHaveBeenCalled();
  });
});
