import { describe, expect, it } from 'vitest';

import {
  normalizePlaceListParams,
  normalizePublicDiscoverySearch,
  normalizePublicPlaceListParams,
  normalizePublicPlaceSlug,
  parsePlacesSearch,
  parsePublicPlacesSearch,
  publicDiscoveryToListParams,
} from '../../schemas/places.schema';
import { placesKeys } from '../places.key';

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

  it('isolates management details by place ID', () => {
    expect(placesKeys.managementDetail('place-a')).not.toEqual(placesKeys.managementDetail('place-b'));
    expect(placesKeys.managementDetail('place-a')).toEqual(['places', 'management', 'detail', 'place-a']);
  });
});

describe('public place discovery state', () => {
  it('normalizes route state and always uses the bounded customer page size', () => {
    const routeSearch = parsePublicPlacesSearch({
      page: '2',
      limit: '100',
      search: ' coffee ',
      type: 'CAFE',
      city: ' Bandung ',
      ignored: 'x',
    });

    expect(routeSearch).toEqual({ page: 2, search: 'coffee', type: 'CAFE', city: 'Bandung' });
    expect(publicDiscoveryToListParams(normalizePublicDiscoverySearch(routeSearch))).toEqual({
      page: 2,
      limit: 12,
      search: 'coffee',
      type: 'CAFE',
      city: 'Bandung',
    });
    expect(normalizePublicPlaceListParams({ page: -1, limit: 500, search: ' ' })).toEqual({
      page: 1,
      limit: 12,
    });
  });

  it('enforces text bounds and normalizes public slugs', () => {
    expect(() => parsePublicPlacesSearch({ search: 'x'.repeat(121) })).toThrow();
    expect(() => parsePublicPlacesSearch({ city: 'x'.repeat(101) })).toThrow();
    expect(normalizePublicPlaceSlug('  TOOANG-CAFE ')).toBe('tooang-cafe');
    expect(() => normalizePublicPlaceSlug('not a slug')).toThrow();
  });

  it('isolates every public list filter and detail slug', () => {
    const first = placesKeys.publicList({ page: 1, limit: 12, search: 'coffee', type: 'CAFE' });
    const second = placesKeys.publicList({ page: 2, limit: 12, search: 'coffee', type: 'CAFE' });
    const third = placesKeys.publicList({ page: 1, limit: 12, search: 'tea', type: 'CAFE' });

    expect(first).not.toEqual(second);
    expect(first).not.toEqual(third);
    expect(placesKeys.publicDetail('place-a')).not.toEqual(placesKeys.publicDetail('place-b'));
    expect(placesKeys.publicDetail('PLACE-A')).toEqual(['places', 'public', 'detail', 'place-a']);
  });
});
