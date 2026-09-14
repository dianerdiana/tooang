import { createPlaceSchema, listPlacesSchema, updatePlaceSchema } from './places.schema';

describe('place schemas', () => {
  const valid = {
    name: '  Test Place  ',
    slug: '  TEST-PLACE  ',
    type: 'CAFE' as const,
    address: 'Address',
    timezone: 'Asia/Jakarta',
  };

  it('normalizes the name and slug and accepts an IANA timezone', () => {
    expect(createPlaceSchema.parse(valid)).toMatchObject({
      name: 'Test Place',
      slug: 'test-place',
      timezone: 'Asia/Jakarta',
    });
  });

  it('rejects invalid timezones', () => {
    expect(() => createPlaceSchema.parse({ ...valid, timezone: 'Mars/Olympus' })).toThrow();
  });

  it('validates field boundaries, coordinates, type, and strict input', () => {
    expect(() => createPlaceSchema.parse({ ...valid, name: 'a'.repeat(121) })).toThrow();
    expect(() => createPlaceSchema.parse({ ...valid, latitude: 91 })).toThrow();
    expect(() => createPlaceSchema.parse({ ...valid, longitude: -181 })).toThrow();
    expect(() => createPlaceSchema.parse({ ...valid, type: 'HOTEL' })).toThrow();
    expect(() => createPlaceSchema.parse({ ...valid, isPublished: true })).toThrow();
  });

  it('normalizes nullable clearing and rejects empty or protected updates', () => {
    expect(updatePlaceSchema.parse({ city: '   ', phone: null })).toEqual({
      city: null,
      phone: null,
    });
    expect(() => updatePlaceSchema.parse({})).toThrow();
    expect(() => updatePlaceSchema.parse({ isPublished: true })).toThrow();
  });

  it('applies bounded public pagination defaults', () => {
    expect(listPlacesSchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(() => listPlacesSchema.parse({ limit: 101 })).toThrow();
  });
});
