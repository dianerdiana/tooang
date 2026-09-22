export const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export type BusinessHour = {
  day: DayOfWeek;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type BusinessHourInput =
  { isClosed: true; opensAt?: null; closesAt?: null } | { isClosed: false; opensAt: string; closesAt: string };

export type BusinessHourFormValues = {
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};
