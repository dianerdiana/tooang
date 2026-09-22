import { describe, expect, it } from 'vitest';

import { businessHourInputSchema, isOvernightRange, toBusinessHourInput } from './business-hours.schema';

describe('business hour validation', () => {
  it('accepts closed days without times', () => {
    expect(toBusinessHourInput({ isClosed: true, opensAt: '', closesAt: '' })).toEqual({ isClosed: true });
  });

  it('accepts same-day and overnight ranges', () => {
    expect(businessHourInputSchema.safeParse({ isClosed: false, opensAt: '09:00', closesAt: '17:00' }).success).toBe(
      true,
    );
    expect(businessHourInputSchema.safeParse({ isClosed: false, opensAt: '22:00', closesAt: '02:00' }).success).toBe(
      true,
    );
    expect(isOvernightRange('22:00', '02:00')).toBe(true);
  });

  it('rejects malformed and equal times', () => {
    expect(businessHourInputSchema.safeParse({ isClosed: false, opensAt: '9:00', closesAt: '17:00' }).success).toBe(
      false,
    );
    expect(businessHourInputSchema.safeParse({ isClosed: false, opensAt: '09:00', closesAt: '09:00' }).success).toBe(
      false,
    );
  });
});
