import { createPlaceSchema } from './places.schema';

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

  it('rejects reserved slugs and invalid timezones', () => {
    expect(() => createPlaceSchema.parse({ ...valid, slug: 'api' })).toThrow();
    expect(() => createPlaceSchema.parse({ ...valid, timezone: 'Mars/Olympus' })).toThrow();
  });
});
