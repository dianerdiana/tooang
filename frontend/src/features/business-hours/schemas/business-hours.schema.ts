import { z } from 'zod';

import type { BusinessHour, BusinessHourFormValues, BusinessHourInput } from '../types/business-hours.type';

export const businessTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid 24-hour time');

export const businessHourInputSchema = z.discriminatedUnion('isClosed', [
  z.object({ isClosed: z.literal(true), opensAt: z.null().optional(), closesAt: z.null().optional() }).strict(),
  z
    .object({ isClosed: z.literal(false), opensAt: businessTimeSchema, closesAt: businessTimeSchema })
    .strict()
    .refine((value) => value.opensAt !== value.closesAt, {
      message: 'Opening and closing times must differ',
      path: ['closesAt'],
    }),
]);

export const businessHourToFormValues = (hour: BusinessHour): BusinessHourFormValues => ({
  isClosed: hour.isClosed,
  opensAt: hour.opensAt ?? '09:00',
  closesAt: hour.closesAt ?? '17:00',
});

export const toBusinessHourInput = (values: BusinessHourFormValues): BusinessHourInput =>
  businessHourInputSchema.parse(
    values.isClosed ? { isClosed: true } : { isClosed: false, opensAt: values.opensAt, closesAt: values.closesAt },
  );

export const isOvernightRange = (opensAt: string, closesAt: string) => closesAt < opensAt;
