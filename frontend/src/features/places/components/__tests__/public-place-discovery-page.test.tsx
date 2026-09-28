import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { PublicPlaceListItem } from '../../types/places.type';
import {
  DiscoverySkeleton,
  getPlaceCardMedia,
  getResultRange,
  nextDiscoveryFilters,
} from '../public-place-discovery-page';

const place: PublicPlaceListItem = {
  id: 'place-1',
  name: 'Tooang Cafe',
  slug: 'tooang-cafe',
  type: 'CAFE',
  description: null,
  address: 'Jl. Merdeka 1',
  city: 'Bandung',
  latitude: null,
  longitude: null,
  phone: null,
  whatsapp: null,
  timezone: 'Asia/Jakarta',
  isPublished: true,
  isOrderingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  logoUrl: 'https://example.com/logo.png',
  coverUrl: 'https://example.com/cover.png',
};

describe('public place discovery presentation', () => {
  it('uses cover, logo, then a stable image fallback', () => {
    expect(getPlaceCardMedia(place)).toMatchObject({ kind: 'cover', fit: 'cover' });
    expect(getPlaceCardMedia({ ...place, coverUrl: null })).toMatchObject({ kind: 'logo', fit: 'contain' });
    expect(getPlaceCardMedia({ ...place, coverUrl: null, logoUrl: null })).toMatchObject({ kind: 'fallback' });
  });

  it('resets pagination for filter changes and keeps explicit page navigation', () => {
    const current = { page: 3, search: 'coffee', type: 'CAFE' as const };
    expect(nextDiscoveryFilters(current, { search: 'tea' })).toEqual({
      page: 1,
      search: 'tea',
      type: 'CAFE',
    });
    expect(nextDiscoveryFilters(current, { search: undefined })).toEqual({ page: 1, type: 'CAFE' });
    expect(nextDiscoveryFilters(current, { page: 4 })).toEqual({ ...current, page: 4 });
  });

  it('reports metadata ranges without fabricating results', () => {
    expect(getResultRange({ page: 2, limit: 12, totalItems: 25, totalPages: 3 })).toBe('13–24 of 25 places');
    expect(getResultRange({ page: 1, limit: 12, totalItems: 0, totalPages: 0 })).toBe('No places');
  });

  it('renders geometry-matched discovery skeletons', () => {
    const markup = renderToStaticMarkup(<DiscoverySkeleton />);
    expect(markup).toContain('aria-label="Loading places"');
    expect(markup).toContain('aspect-[4/3]');
    expect(markup.match(/rounded-surface/g)?.length).toBe(8);
  });
});
