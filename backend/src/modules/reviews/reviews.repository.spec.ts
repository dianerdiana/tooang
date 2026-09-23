import { jest } from '@jest/globals';

import { ReviewsRepository } from './reviews.repository';

describe('ReviewsRepository moderation lists', () => {
  const setup = () => {
    const placeReview = {
      findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
      count: jest.fn<() => Promise<unknown>>().mockResolvedValue(0),
    };
    const menuItemReview = {
      findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([]),
      count: jest.fn<() => Promise<unknown>>().mockResolvedValue(0),
    };
    const prisma = {
      placeReview,
      menuItemReview,
      $transaction: jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations)),
    };
    return { repository: new ReviewsRepository(prisma as never), placeReview, menuItemReview };
  };

  it('lists active place reviews without public-place lifecycle restrictions', async () => {
    const { repository, placeReview } = setup();
    await repository.listPlaceReviewsForModeration(2, 20, 'place-id');

    expect(placeReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, placeId: 'place-id' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it('filters item reviews by context without availability or publication restrictions', async () => {
    const { repository, menuItemReview } = setup();
    await repository.listMenuItemReviewsForModeration(1, 50, {
      placeId: 'place-id',
      menuItemId: 'item-id',
    });

    expect(menuItemReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          menuItemId: 'item-id',
          menuItem: { placeId: 'place-id' },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });
});
