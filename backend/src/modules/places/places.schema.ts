import { z } from 'zod';

import { PlaceMemberRole, PlaceType } from '@/generated/prisma/client';

import { paginationFields } from '@/common/schemas';

export const RESERVED_PLACE_SLUGS = new Set(['api', 'admin', 'auth', 'me', 'users', 'places']);

const unicodeLength = (value: string) => Array.from(value).length;

const boundedText = (maximum: number, minimum = 0) =>
  z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => unicodeLength(value) >= minimum,
      `Must contain at least ${minimum} characters`,
    )
    .refine(
      (value) => unicodeLength(value) <= maximum,
      `Must contain at most ${maximum} characters`,
    );

const nullableText = (maximum: number) =>
  z.union([boundedText(maximum), z.null()]).transform((value) => value || null);

export function isIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const placeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export function isReservedPlaceSlug(slug: string): boolean {
  return RESERVED_PLACE_SLUGS.has(slug);
}

const timezoneSchema = z.string().trim().refine(isIanaTimezone, 'Must be a valid IANA timezone');

export const createPlaceSchema = z
  .object({
    name: boundedText(120, 1),
    slug: placeSlugSchema,
    type: z.enum(PlaceType),
    description: nullableText(2000).optional(),
    address: boundedText(500, 1),
    city: nullableText(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    phone: nullableText(30).optional(),
    whatsapp: nullableText(30).optional(),
    timezone: timezoneSchema,
  })
  .strict();

export const updatePlaceSchema = z
  .object({
    name: boundedText(120, 1).optional(),
    slug: placeSlugSchema.optional(),
    type: z.enum(PlaceType).optional(),
    description: nullableText(2000).optional(),
    address: boundedText(500, 1).optional(),
    city: nullableText(100).optional(),
    latitude: z.union([z.number().min(-90).max(90), z.null()]).optional(),
    longitude: z.union([z.number().min(-180).max(180), z.null()]).optional(),
    phone: nullableText(30).optional(),
    whatsapp: nullableText(30).optional(),
    timezone: timezoneSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one supported field is required');

export const listPlacesSchema = z
  .object({
    ...paginationFields,
    search: z.string().trim().max(120).optional(),
    type: z.enum(PlaceType).optional(),
    city: z.string().trim().max(100).optional(),
  })
  .strict();

export const placeSlugParamSchema = z.object({ slug: placeSlugSchema }).strict();
export const publishingSchema = z.object({ isPublished: z.boolean() }).strict();
export const orderingSchema = z.object({ isOrderingEnabled: z.boolean() }).strict();

export const placeIdParamSchema = z.object({ placeId: z.string().uuid() }).strict();
export const placeMemberParamSchema = z
  .object({ placeId: z.string().uuid(), userId: z.string().min(1).max(100) })
  .strict();
export const placeMemberRoleSchema = z.object({ role: z.enum(PlaceMemberRole) }).strict();

export type PlaceIdParam = z.infer<typeof placeIdParamSchema>;
export type PlaceMemberParam = z.infer<typeof placeMemberParamSchema>;
export type PlaceMemberRoleInput = z.infer<typeof placeMemberRoleSchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;
export type ListPlacesInput = z.infer<typeof listPlacesSchema>;
export type PlaceSlugParam = z.infer<typeof placeSlugParamSchema>;
export type PublishingInput = z.infer<typeof publishingSchema>;
export type OrderingInput = z.infer<typeof orderingSchema>;
