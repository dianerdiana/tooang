import { z } from 'zod';

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
