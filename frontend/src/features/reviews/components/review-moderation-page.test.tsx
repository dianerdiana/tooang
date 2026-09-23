import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { ApplicationError } from '@/types/api-response.type';

import type { MenuItemModerationReview, PlaceModerationReview } from '../types/reviews.type';

import { moderationErrorMessage, ReviewCards, ReviewsTable } from './review-moderation-page';

const base = {
  reviewId: 'review-id',
  rating: 2,
  comment: 'Needs attention',
  reviewer: { userId: 'usr_public', fullName: 'Public Reviewer' },
  place: { placeId: 'place-public', name: 'Review Cafe' },
  createdAt: '2026-09-23T00:00:00.000Z',
  updatedAt: '2026-09-23T01:00:00.000Z',
};
const placeReview: PlaceModerationReview = base;
const itemReview: MenuItemModerationReview = {
  ...base,
  reviewId: 'item-review-id',
  menuItem: { menuItemId: 'item-public', name: 'Reviewed Coffee' },
};

const common = {
  pendingReviewId: undefined,
  failedReviewId: undefined,
  mutationError: undefined,
  onModerate: () => undefined,
};

describe('moderation review results', () => {
  it('renders only safe review, author, and place context', () => {
    const markup = renderToStaticMarkup(<ReviewsTable {...common} reviews={[placeReview]} tab='place' />);
    expect(markup).toContain('Place review');
    expect(markup).toContain('Needs attention');
    expect(markup).toContain('Public Reviewer');
    expect(markup).toContain('usr_public');
    expect(markup).toContain('Review Cafe');
    expect(markup).not.toContain('orderId');
    expect(markup).not.toContain('email');
  });

  it('renders menu-item context and destructive confirmation triggers', () => {
    const markup = renderToStaticMarkup(<ReviewCards {...common} reviews={[itemReview]} tab='menu-item' />);
    expect(markup).toContain('Menu item review');
    expect(markup).toContain('Reviewed Coffee');
    expect(markup).toContain('Remove');
  });

  it('shows safe permission and missing-resource messages', () => {
    const forbidden: ApplicationError = {
      error: true,
      message: 'Insufficient permissions',
      code: 'FORBIDDEN',
      httpStatus: 403,
      isNetworkError: false,
    };
    expect(moderationErrorMessage(forbidden)).toContain('capabilities changed');
    expect(moderationErrorMessage({ ...forbidden, httpStatus: 404 })).toContain('removed');
  });
});
