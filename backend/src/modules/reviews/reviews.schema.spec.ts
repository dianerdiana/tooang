import { createReviewSchema, reviewListSchema, updateReviewSchema } from './reviews.schema';

const orderId = '5D2B73E0-84F0-4F8C-A3E8-733E7B8312AE';

describe('review schemas', () => {
  it('accepts rating boundaries and normalizes identifiers and comments', () => {
    expect(createReviewSchema.parse({ orderId, rating: 1, comment: '  cafe\u0301  ' })).toEqual({
      orderId: orderId.toLowerCase(),
      rating: 1,
      comment: 'café',
    });
    expect(createReviewSchema.parse({ orderId, rating: 5, comment: '   ' }).comment).toBeNull();
  });

  it.each([0, 6, 2.5])('rejects invalid rating %s', (rating) => {
    expect(() => createReviewSchema.parse({ orderId, rating })).toThrow();
  });

  it('counts Unicode code points and enforces the 2000-character limit', () => {
    expect(
      createReviewSchema.parse({ orderId, rating: 5, comment: '🙂'.repeat(2000) }),
    ).toBeDefined();
    expect(() =>
      createReviewSchema.parse({ orderId, rating: 5, comment: '🙂'.repeat(2001) }),
    ).toThrow();
  });

  it('requires a supported update field and rejects unknown fields', () => {
    expect(() => updateReviewSchema.parse({})).toThrow();
    expect(() => updateReviewSchema.parse({ rating: 4, orderId })).toThrow();
    expect(() => createReviewSchema.parse({ orderId, rating: 4, userId: 'spoofed' })).toThrow();
  });

  it('applies bounded pagination defaults', () => {
    expect(reviewListSchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(() => reviewListSchema.parse({ limit: 101 })).toThrow();
  });
});
