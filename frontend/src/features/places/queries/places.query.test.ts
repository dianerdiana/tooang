import { describe, expect, it } from 'vitest';

import { normalizePlaceListParams, parsePlacesSearch } from '../schemas/places.schema';

import { placesKeys } from './places.key';

describe('management place list state', () => {
  it('normalizes route input and rejects unsupported values through defaults', () => {
    expect(parsePlacesSearch({ page: '2', limit: '50', search: ' coffee ', type: 'CAFE', ignored: 'x' })).toEqual({
      page: 2,
      limit: 50,
      search: 'coffee',
      type: 'CAFE',
    });
    expect(normalizePlaceListParams({ page: -1, limit: 500, search: ' ' })).toEqual({ page: 1, limit: 20 });
  });

  it('isolates caches by every supported filter', () => {
    const first = placesKeys.managementList({ page: 1, search: 'coffee', type: 'CAFE' });
    const second = placesKeys.managementList({ page: 2, search: 'coffee', type: 'CAFE' });
    const third = placesKeys.managementList({ page: 1, search: 'coffee', type: 'RESTAURANT' });

    expect(first).not.toEqual(second);
    expect(first).not.toEqual(third);
  });
});
