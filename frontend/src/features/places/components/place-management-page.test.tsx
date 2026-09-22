import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { PlaceSummary } from '../types/places.type';

import { PlaceOverview } from './place-management-page';

const place: PlaceSummary = {
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
  whatsapp: '0812345',
  timezone: 'Asia/Jakarta',
  isPublished: false,
  isOrderingEnabled: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  logoUrl: null,
  coverUrl: null,
};

describe('place management overview', () => {
  it('renders backend fields, explicit statuses, and media fallbacks without edit toggles', () => {
    const markup = renderToStaticMarkup(<PlaceOverview place={place} />);

    expect(markup).toContain('Tooang Cafe');
    expect(markup).toContain('Asia/Jakarta');
    expect(markup).toContain('Draft');
    expect(markup).toContain('Ordering disabled');
    expect(markup).toContain('No logo');
    expect(markup).toContain('No cover');
    expect(markup).not.toContain('Publish place');
    expect(markup).not.toContain('Enable ordering');
  });
});
