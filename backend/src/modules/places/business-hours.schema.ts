import { z } from 'zod';

import { DayOfWeek } from '@/generated/prisma/client';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must use HH:mm');

export const businessHourParamSchema = z
  .object({ placeId: z.string().uuid(), day: z.enum(DayOfWeek) })
  .strict();

export const businessHourSchema = z.discriminatedUnion('isClosed', [
  z
    .object({
      isClosed: z.literal(true),
      opensAt: z.null().optional(),
      closesAt: z.null().optional(),
    })
    .strict(),
  z
    .object({ isClosed: z.literal(false), opensAt: timeSchema, closesAt: timeSchema })
    .strict()
    .refine((value) => value.opensAt !== value.closesAt, 'Opening and closing times must differ'),
]);

export type BusinessHourParam = z.infer<typeof businessHourParamSchema>;
export type BusinessHourInput = z.infer<typeof businessHourSchema>;
