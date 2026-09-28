import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import type { PublicPlaceDetail } from '../../types/places.type';
import {
  AvailabilitySummary,
  BusinessHoursSection,
  formatBusinessHour,
  getDayInTimezone,
  getPlaceHeroMedia,
  orderBusinessHours,
  PlaceContactDetails,
  PlaceDetailSkeleton,
  PlaceHero,
  sanitizeTelephoneHref,
  sanitizeWhatsAppHref,
} from '../public-place-detail-page';

const hours: PublicPlaceDetail['businessHours'] = [
  { day: 'SUNDAY', isClosed: true, opensAt: null, closesAt: null },
  { day: 'MONDAY', isClosed: false, opensAt: '08:00', closesAt: '17:00' },
  { day: 'TUESDAY', isClosed: false, opensAt: '18:00', closesAt: '02:00' },
  { day: 'WEDNESDAY', isClosed: true, opensAt: null, closesAt: null },
  { day: 'THURSDAY', isClosed: false, opensAt: '08:00', closesAt: '17:00' },
  { day: 'FRIDAY', isClosed: false, opensAt: '09:00', closesAt: '21:00' },
  { day: 'SATURDAY', isClosed: false, opensAt: '09:00', closesAt: '21:00' },
];

const place: PublicPlaceDetail = {
  id: 'place-1',
  name: 'Tooang Cafe',
  slug: 'tooang-cafe',
  type: 'CAFE',
  description: 'Coffee and food',
  address: 'Jl. Merdeka 1',
  city: 'Bandung',
  latitude: null,
  longitude: null,
  phone: '+62 (22) 123-456',
  whatsapp: '+62 812-3456-7890',
  timezone: 'Asia/Jakarta',
  isPublished: true,
  isOrderingEnabled: true,
  isOpen: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  logoUrl: 'https://example.com/logo.png',
  coverUrl: 'https://example.com/cover.png',
  businessHours: hours,
};

describe('public place detail presentation', () => {
  it('selects today using the place timezone rather than the device timezone', () => {
    const instant = new Date('2026-01-01T18:00:00.000Z');
    expect(getDayInTimezone('UTC', instant)).toBe('THURSDAY');
    expect(getDayInTimezone('Asia/Jakarta', instant)).toBe('FRIDAY');
    expect(getDayInTimezone('Invalid/Timezone', instant)).toBeUndefined();
  });

  it('orders seven-day hours and preserves regular, closed, and overnight periods', () => {
    expect(orderBusinessHours(hours).map((hour) => hour.day)).toEqual([
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ]);
    expect(formatBusinessHour(hours[1])).toBe('08:00–17:00');
    expect(formatBusinessHour(hours[2])).toBe('18:00–02:00 (overnight)');
    expect(formatBusinessHour(hours[0])).toBe('Closed');
    expect(formatBusinessHour(undefined)).toBe('Closed');
  });

  it('renders today first and exposes all seven days through a native disclosure', () => {
    const markup = renderToStaticMarkup(
      <BusinessHoursSection place={place} instant={new Date('2026-01-01T18:00:00.000Z')} />,
    );
    expect(markup).toContain('Today · Friday');
    expect(markup).toContain('09:00–21:00');
    expect(markup).toContain('<details');
    expect(markup).toContain('All weekly hours');
  });

  it('uses cover, logo, and neutral hero fallback without layout changes', () => {
    expect(getPlaceHeroMedia(place)).toMatchObject({ kind: 'cover', fit: 'cover' });
    expect(getPlaceHeroMedia({ coverUrl: null, logoUrl: place.logoUrl })).toMatchObject({
      kind: 'logo',
      fit: 'contain',
    });
    expect(getPlaceHeroMedia({ coverUrl: null, logoUrl: null })).toMatchObject({ kind: 'fallback' });

    const markup = renderToStaticMarkup(<PlaceHero place={place} />);
    expect(markup).toContain('Tooang Cafe cover');
    expect(markup).toContain('Tooang Cafe logo');
    expect(markup).toContain('aspect-video');
  });

  it('keeps opening and ordering status independent while browsing remains explained', () => {
    const closed = renderToStaticMarkup(<AvailabilitySummary place={{ isOpen: false, isOrderingEnabled: true }} />);
    const orderingOff = renderToStaticMarkup(
      <AvailabilitySummary place={{ isOpen: true, isOrderingEnabled: false }} />,
    );
    const both = renderToStaticMarkup(<AvailabilitySummary place={{ isOpen: false, isOrderingEnabled: false }} />);

    expect(closed).toContain('Closed');
    expect(closed).toContain('Ordering available');
    expect(orderingOff).toContain('Open');
    expect(orderingOff).toContain('Ordering unavailable');
    expect(both).toContain('This place is currently closed. Online ordering is unavailable.');
    expect(both).toContain('continue browsing the menu');
  });

  it('renders safe contact links and an explicit missing-contact state', () => {
    expect(sanitizeTelephoneHref('+62 (22) 123-456')).toBe('tel:+6222123456');
    expect(sanitizeWhatsAppHref('+62 812-3456-7890')).toBe('https://wa.me/6281234567890');

    const present = renderToStaticMarkup(<PlaceContactDetails place={place} />);
    const missing = renderToStaticMarkup(<PlaceContactDetails place={{ ...place, phone: null, whatsapp: null }} />);
    expect(present).toContain('tel:+6222123456');
    expect(present).toContain('https://wa.me/6281234567890');
    expect(missing).toContain('Contact information is not available.');
  });

  it('renders stable loading geometry', () => {
    const markup = renderToStaticMarkup(<PlaceDetailSkeleton />);
    expect(markup).toContain('aria-label="Loading place details"');
    expect(markup).toContain('aspect-video');
  });
});
