import { DayOfWeek } from '@/generated/prisma/client';

import { evaluatePlaceOpen, serializeBusinessHours } from './place-opening-state.service';

const at = (time: string) => new Date(`1970-01-01T${time}:00.000Z`);
const hour = (day: DayOfWeek, opensAt: string, closesAt: string) => ({
  day,
  opensAt: at(opensAt),
  closesAt: at(closesAt),
  isClosed: false,
});

describe('place opening state', () => {
  it('treats missing and explicitly closed days as closed', () => {
    const instant = new Date('2026-09-14T02:00:00.000Z');
    expect(evaluatePlaceOpen('Asia/Jakarta', [], instant)).toBe(false);
    expect(
      evaluatePlaceOpen(
        'Asia/Jakarta',
        [{ day: DayOfWeek.MONDAY, opensAt: null, closesAt: null, isClosed: true }],
        instant,
      ),
    ).toBe(false);
    expect(serializeBusinessHours([])).toHaveLength(7);
  });

  it('uses open-inclusive and close-exclusive boundaries', () => {
    const hours = [hour(DayOfWeek.MONDAY, '09:00', '17:00')];
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-14T09:00:00Z'))).toBe(true);
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-14T16:59:59Z'))).toBe(true);
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-14T17:00:00Z'))).toBe(false);
  });

  it('carries overnight hours into the following day, including Sunday to Monday', () => {
    const hours = [hour(DayOfWeek.SUNDAY, '22:00', '02:00')];
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-13T23:00:00Z'))).toBe(true);
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-14T01:59:59Z'))).toBe(true);
    expect(evaluatePlaceOpen('UTC', hours, new Date('2026-09-14T02:00:00Z'))).toBe(false);
  });

  it('derives local state from the configured IANA timezone', () => {
    const hours = [hour(DayOfWeek.MONDAY, '08:00', '09:00')];
    const instant = new Date('2026-09-14T01:30:00Z');
    expect(evaluatePlaceOpen('Asia/Jakarta', hours, instant)).toBe(true);
    expect(evaluatePlaceOpen('Asia/Tokyo', hours, instant)).toBe(false);
    expect(evaluatePlaceOpen('America/New_York', hours, instant)).toBe(false);
  });

  it('handles spring-forward and repeated fall-back wall times from fixed instants', () => {
    expect(
      evaluatePlaceOpen(
        'America/New_York',
        [hour(DayOfWeek.SUNDAY, '03:00', '04:00')],
        new Date('2026-03-08T07:30:00Z'),
      ),
    ).toBe(true);
    const fallHours = [hour(DayOfWeek.SUNDAY, '01:00', '02:00')];
    expect(evaluatePlaceOpen('America/New_York', fallHours, new Date('2026-11-01T05:30:00Z'))).toBe(
      true,
    );
    expect(evaluatePlaceOpen('America/New_York', fallHours, new Date('2026-11-01T06:30:00Z'))).toBe(
      true,
    );
  });
});
