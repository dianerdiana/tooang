import { describe, expect, it } from 'vitest';

import type { PlaceSummary } from '../types/places.type';

import {
  changedPlaceProfileFields,
  defaultCreatePlaceValues,
  normalizeCreatePlaceInput,
  placeProfileSchema,
  placeToFormValues,
} from './places.schema';

const place: PlaceSummary = {
  id: 'place-1',
  name: 'Tooang Cafe',
  slug: 'tooang-cafe',
  type: 'CAFE',
  description: 'Coffee and food',
  address: 'Jl. Merdeka 1',
  city: 'Bandung',
  latitude: -6.9,
  longitude: 107.6,
  phone: '022123',
  whatsapp: null,
  timezone: 'Asia/Jakarta',
  isPublished: true,
  isOrderingEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  logoUrl: null,
  coverUrl: null,
};

describe('place profile form schema', () => {
  it('normalizes a create payload and omits blank optional fields', () => {
    expect(
      normalizeCreatePlaceInput({
        ...defaultCreatePlaceValues,
        name: '  New Place ',
        slug: ' NEW-PLACE ',
        address: ' Address ',
        latitude: '-6.9',
      }),
    ).toEqual({
      name: 'New Place',
      slug: 'new-place',
      type: 'RESTAURANT',
      address: 'Address',
      timezone: 'Asia/Jakarta',
      latitude: -6.9,
    });
  });

  it('prepopulates all supported mutable fields', () => {
    expect(placeToFormValues(place)).toMatchObject({
      name: 'Tooang Cafe',
      latitude: '-6.9',
      longitude: '107.6',
      whatsapp: '',
    });
  });

  it('returns only normalized changed fields and clears nullable values', () => {
    const values = placeToFormValues(place);
    expect(changedPlaceProfileFields({ ...values, name: '  New name ', city: '   ' }, place)).toEqual({
      name: 'New name',
      city: null,
    });
    expect(changedPlaceProfileFields(values, place)).toEqual({});
  });

  it('rejects invalid slug, timezone, and coordinates', () => {
    const values = placeToFormValues(place);
    expect(placeProfileSchema.safeParse({ ...values, slug: 'Bad Slug' }).success).toBe(false);
    expect(placeProfileSchema.safeParse({ ...values, timezone: 'Mars/Olympus' }).success).toBe(false);
    expect(placeProfileSchema.safeParse({ ...values, latitude: '91' }).success).toBe(false);
  });
});
