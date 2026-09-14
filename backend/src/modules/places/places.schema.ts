import { z } from 'zod';

import { PlaceMemberRole, PlaceType } from '@/generated/prisma/client';

const RESERVED_SLUGS = new Set(['api', 'admin', 'auth', 'me', 'users', 'places']);

function isIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const createPlaceSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine((slug) => !RESERVED_SLUGS.has(slug), 'Reserved place slug'),
    type: z.enum(PlaceType),
    description: z.string().trim().max(2000).optional(),
    address: z.string().trim().min(1).max(500),
    city: z.string().trim().max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    phone: z.string().trim().max(30).optional(),
    whatsapp: z.string().trim().max(30).optional(),
    timezone: z.string().trim().refine(isIanaTimezone, 'Must be a valid IANA timezone'),
  })
  .strict();

export const placeIdParamSchema = z.object({ placeId: z.string().uuid() }).strict();
export const placeMemberParamSchema = z
  .object({ placeId: z.string().uuid(), userId: z.string().min(1).max(100) })
  .strict();
export const placeMemberRoleSchema = z.object({ role: z.enum(PlaceMemberRole) }).strict();

export type PlaceIdParam = z.infer<typeof placeIdParamSchema>;
export type PlaceMemberParam = z.infer<typeof placeMemberParamSchema>;
export type PlaceMemberRoleInput = z.infer<typeof placeMemberRoleSchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
