import { businessHourParamSchema, businessHourSchema } from './business-hours.schema';

describe('business-hour schemas', () => {
  it('accepts canonical closed and open inputs', () => {
    expect(businessHourSchema.parse({ isClosed: true })).toEqual({ isClosed: true });
    expect(
      businessHourSchema.parse({ isClosed: false, opensAt: '22:00', closesAt: '02:00' }),
    ).toEqual({ isClosed: false, opensAt: '22:00', closesAt: '02:00' });
  });

  it('rejects inconsistent, equal, and malformed times', () => {
    expect(() => businessHourSchema.parse({ isClosed: true, opensAt: '09:00' })).toThrow();
    expect(() =>
      businessHourSchema.parse({ isClosed: false, opensAt: '09:00', closesAt: '09:00' }),
    ).toThrow();
    expect(() =>
      businessHourSchema.parse({ isClosed: false, opensAt: '9:00', closesAt: '17:00' }),
    ).toThrow();
  });

  it('rejects invalid weekday path values', () => {
    expect(() =>
      businessHourParamSchema.parse({
        placeId: '21c4679c-aed5-4824-b3d3-bf738b9c01e1',
        day: 'FUNDAY',
      }),
    ).toThrow();
  });
});
