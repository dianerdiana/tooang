import { z } from 'zod';

import type { PlaceProfileFormValues, PlaceSummary, PlaceUpdateInput } from '../types/places.type';
import { type NormalizedPlaceListParams, PLACE_TYPE, type PlaceListParams } from '../types/places.type';

export const DEFAULT_PLACES_PAGE = 1;
export const DEFAULT_PLACES_LIMIT = 20;

const optionalTrimmedString = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    z.string().max(maximum).optional(),
  );

const positiveInteger = (fallback: number, maximum?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
      return fallback;
    },
    maximum ? z.number().int().min(1).max(maximum).catch(fallback) : z.number().int().min(1).catch(fallback),
  );

export const placesSearchSchema = z
  .object({
    page: positiveInteger(DEFAULT_PLACES_PAGE),
    limit: positiveInteger(DEFAULT_PLACES_LIMIT, 100),
    search: optionalTrimmedString(120),
    type: z.enum(PLACE_TYPE).optional().catch(undefined),
    city: optionalTrimmedString(100),
  })
  .strip();

export const parsePlacesSearch = (search: Record<string, unknown>): NormalizedPlaceListParams =>
  placesSearchSchema.parse(search) as NormalizedPlaceListParams;

export const normalizePlaceListParams = (params: PlaceListParams): NormalizedPlaceListParams => {
  const parsed = placesSearchSchema.parse(params) as NormalizedPlaceListParams;
  return {
    page: parsed.page,
    limit: parsed.limit,
    ...(parsed.search ? { search: parsed.search } : {}),
    ...(parsed.type ? { type: parsed.type } : {}),
    ...(parsed.city ? { city: parsed.city } : {}),
  };
};

const requiredText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum, 'This field is required').max(maximum);

const optionalText = (maximum: number) => z.string().trim().max(maximum);

const coordinate = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= minimum && Number(value) <= maximum),
      {
        message: `Must be between ${minimum} and ${maximum}`,
      },
    );

export const placeProfileSchema = z.object({
  name: requiredText(1, 120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'This field is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens'),
  type: z.enum(PLACE_TYPE),
  description: optionalText(2000),
  address: requiredText(1, 500),
  city: optionalText(100),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  timezone: z
    .string()
    .trim()
    .min(1, 'This field is required')
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, 'Enter a valid IANA timezone'),
});

export const placeToFormValues = (place: PlaceSummary): PlaceProfileFormValues => ({
  name: place.name,
  slug: place.slug,
  type: place.type,
  description: place.description ?? '',
  address: place.address,
  city: place.city ?? '',
  latitude: place.latitude === null ? '' : String(place.latitude),
  longitude: place.longitude === null ? '' : String(place.longitude),
  phone: place.phone ?? '',
  whatsapp: place.whatsapp ?? '',
  timezone: place.timezone,
});

const nullableTextValue = (value: string) => value.trim() || null;
const nullableNumberValue = (value: string) => (value.trim() === '' ? null : Number(value));

export const changedPlaceProfileFields = (values: PlaceProfileFormValues, place: PlaceSummary): PlaceUpdateInput => {
  const parsed = placeProfileSchema.parse(values);
  const normalized = {
    name: parsed.name,
    slug: parsed.slug,
    type: parsed.type,
    description: nullableTextValue(parsed.description),
    address: parsed.address,
    city: nullableTextValue(parsed.city),
    latitude: nullableNumberValue(parsed.latitude),
    longitude: nullableNumberValue(parsed.longitude),
    phone: nullableTextValue(parsed.phone),
    whatsapp: nullableTextValue(parsed.whatsapp),
    timezone: parsed.timezone,
  } satisfies Required<PlaceUpdateInput>;

  return Object.fromEntries(
    Object.entries(normalized).filter(([key, value]) => value !== place[key as keyof PlaceSummary]),
  ) as PlaceUpdateInput;
};
