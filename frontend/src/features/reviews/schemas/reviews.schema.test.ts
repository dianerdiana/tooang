import { describe, expect, it } from 'vitest';

import { normalizeReviewModerationParams, parseReviewModerationSearch } from './reviews.schema';

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
