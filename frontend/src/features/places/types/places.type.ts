import type { ApiPaginationMeta } from '@/types/api-response.type';

export const PLACE_TYPE = {
  RESTAURANT: 'RESTAURANT',
  CAFE: 'CAFE',
  FOOD_STALL: 'FOOD_STALL',
  OTHER: 'OTHER',
} as const;

export type PlaceType = (typeof PLACE_TYPE)[keyof typeof PLACE_TYPE];

export type PlaceSummary = {
  id: string;
  name: string;
  slug: string;
  type: PlaceType;
  description: string | null;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  timezone: string;
  isPublished: boolean;
  isOrderingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  logoUrl: string | null;
  coverUrl: string | null;
};

export type PlaceListParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: PlaceType;
  city?: string;
};

export type NormalizedPlaceListParams = {
  page: number;
  limit: number;
  search?: string;
  type?: PlaceType;
  city?: string;
};

export type PlaceListResult = {
  places: PlaceSummary[];
  meta: ApiPaginationMeta;
};

export type PlaceUpdateInput = Partial<{
  name: string;
  slug: string;
  type: PlaceType;
  description: string | null;
  address: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  timezone: string;
}>;

export type PlaceProfileFormValues = {
  name: string;
  slug: string;
  type: PlaceType;
  description: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  timezone: string;
};
