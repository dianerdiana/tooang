import { Injectable, NotFoundException } from '@nestjs/common';

import { DayOfWeek } from '@/generated/prisma/client';

import { type PlacesDbClient, PlacesRepository } from './places.repository';

export const DAY_ORDER = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
] as const;

export type BusinessHourRecord = {
  day: DayOfWeek;
  opensAt: Date | null;
  closesAt: Date | null;
  isClosed: boolean;
};

const DAY_BY_SHORT_NAME: Record<string, DayOfWeek> = {
  Mon: DayOfWeek.MONDAY,
  Tue: DayOfWeek.TUESDAY,
  Wed: DayOfWeek.WEDNESDAY,
  Thu: DayOfWeek.THURSDAY,
  Fri: DayOfWeek.FRIDAY,
  Sat: DayOfWeek.SATURDAY,
  Sun: DayOfWeek.SUNDAY,
};

export function formatBusinessTime(value: Date | null): string | null {
  if (!value) return null;
  return `${value.getUTCHours().toString().padStart(2, '0')}:${value
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function seconds(value: Date): number {
  return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
}

export function serializeBusinessHours(hours: readonly BusinessHourRecord[]) {
  const configured = new Map(hours.map((hour) => [hour.day, hour]));
  return DAY_ORDER.map((day) => {
    const hour = configured.get(day);
    return {
      day,
      isClosed: hour?.isClosed ?? true,
      opensAt: hour && !hour.isClosed ? formatBusinessTime(hour.opensAt) : null,
      closesAt: hour && !hour.isClosed ? formatBusinessTime(hour.closesAt) : null,
    };
  });
}

export function evaluatePlaceOpen(
  timezone: string,
  hours: readonly BusinessHourRecord[],
  instant: Date,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;
  const day = DAY_BY_SHORT_NAME[part('weekday') ?? ''];
  if (!day) return false;
  const localSeconds =
    Number(part('hour')) * 3600 + Number(part('minute')) * 60 + Number(part('second'));
  const configured = new Map(hours.map((hour) => [hour.day, hour]));
  const current = configured.get(day);
  if (current && !current.isClosed && current.opensAt && current.closesAt) {
    const opens = seconds(current.opensAt);
    const closes = seconds(current.closesAt);
    if (opens < closes && localSeconds >= opens && localSeconds < closes) return true;
    if (opens > closes && localSeconds >= opens) return true;
  }

  const dayIndex = DAY_ORDER.indexOf(day);
  const previous = configured.get(DAY_ORDER[(dayIndex + DAY_ORDER.length - 1) % DAY_ORDER.length]);
  if (previous && !previous.isClosed && previous.opensAt && previous.closesAt) {
    const opens = seconds(previous.opensAt);
    const closes = seconds(previous.closesAt);
    return opens > closes && localSeconds < closes;
  }
  return false;
}

@Injectable()
export class PlaceOpeningStateService {
  constructor(private readonly repository: PlacesRepository) {}

  async isPlaceOpen(placeId: string, instant = new Date(), db?: PlacesDbClient): Promise<boolean> {
    const [place, hours] = await Promise.all([
      this.repository.findPlaceTimezone(placeId, db),
      this.repository.listBusinessHours(placeId, db),
    ]);
    if (!place) throw new NotFoundException('Place not found');
    return evaluatePlaceOpen(place.timezone, hours, instant);
  }
}
