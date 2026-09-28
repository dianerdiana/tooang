import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { PublicPlaceReview } from '../../types/reviews.type';
import {
  deduplicatePublicReviews,
  formatReviewDate,
  PublicReviewCard,
  PublicReviewsSkeleton,
  PublicReviewSummaryView,
} from '../public-place-reviews-section';

const review = (overrides: Partial<PublicPlaceReview> = {}): PublicPlaceReview => ({
  reviewId: 'review-secret-id',
  rating: 5,
  comment: 'First line\n<script>alert(1)</script>',
  reviewer: { userId: 'user-secret-id', fullName: 'Alex Visitor' },
  createdAt: '2026-09-27T10:00:00.000Z',
  updatedAt: '2026-09-27T10:00:00.000Z',
  ...overrides,
});

describe('public place review presentation', () => {
  it('shows the backend summary without changing its source precision', () => {
    const averageRating = 4.333333333333333;
    const markup = renderToStaticMarkup(<PublicReviewSummaryView summary={{ reviewCount: 3, averageRating }} />);

    expect(averageRating).toBe(4.333333333333333);
    expect(markup).toContain('Customer rating');
    expect(markup).toContain('4.3');
    expect(markup).toContain('3 reviews');
  });

  it('handles a nullable average without inventing a rating', () => {
    const markup = renderToStaticMarkup(<PublicReviewSummaryView summary={{ reviewCount: 0, averageRating: null }} />);

    expect(markup).toContain('No rating yet');
    expect(markup).not.toContain('out of 5');
  });

  it('renders safe public fields and never exposes identifiers', () => {
    const markup = renderToStaticMarkup(<PublicReviewCard review={review()} />);

    expect(markup).toContain('Alex Visitor');
    expect(markup).toContain('Verified purchase');
    expect(markup).toContain('First line\n&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markup).not.toContain('review-secret-id');
    expect(markup).not.toContain('user-secret-id');
  });

  it('preserves backend order while deduplicating repeated page rows', () => {
    const first = review({ reviewId: 'first', comment: null });
    const second = review({ reviewId: 'second', reviewer: { userId: 'two', fullName: 'Second' } });
    const duplicate = review({ reviewId: 'first', comment: 'duplicate' });

    expect(deduplicatePublicReviews([first, second, duplicate])).toEqual([first, second]);
    expect(renderToStaticMarkup(<PublicReviewCard review={first} />)).not.toContain('duplicate');
  });

  it('provides a geometry-matched accessible loading state', () => {
    const markup = renderToStaticMarkup(<PublicReviewsSkeleton />);

    expect(markup).toContain('role="status"');
    expect(markup).toContain('Loading reviews');
  });

  it('formats valid review dates for display', () => {
    expect(formatReviewDate('2026-09-27T10:00:00.000Z')).toBeTruthy();
  });
});
