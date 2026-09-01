import { z } from 'zod';

import type { FulfillmentType, OrderListParams, OrderStatus } from '../types/order.type';
import { FULFILLMENT_TYPE, ORDER_STATUS } from '../types/order.type';

import { DEFAULT_ORDER_LIMIT, DEFAULT_ORDER_PAGE } from './order-list.schema';

export type GlobalOrderSearch = {
  page: number;
  limit: number;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
  orderPlaceId?: string;
};

const positiveInteger = (fallback: number, maximum?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
      return fallback;
    },
    maximum ? z.number().int().min(1).max(maximum).catch(fallback) : z.number().int().min(1).catch(fallback),
  );

export const optionalOrderPlaceIdSchema = z
  .preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    z.string().uuid().optional(),
  )
  .catch(undefined);

export const isValidOrderPlaceId = (value: string) =>
  value.trim() === '' || z.string().uuid().safeParse(value.trim()).success;

export const globalOrderSearchSchema = z
  .object({
    page: positiveInteger(DEFAULT_ORDER_PAGE),
    limit: positiveInteger(DEFAULT_ORDER_LIMIT, 100),
    status: z.enum(ORDER_STATUS).optional().catch(undefined),
    fulfillmentType: z.enum(FULFILLMENT_TYPE).optional().catch(undefined),
    orderPlaceId: optionalOrderPlaceIdSchema,
  })
  .strip();

export const parseGlobalOrderSearch = (search: Record<string, unknown>): GlobalOrderSearch =>
  globalOrderSearchSchema.parse(search) as GlobalOrderSearch;

export const toGlobalOrderListParams = (filters: GlobalOrderSearch): OrderListParams => ({
  page: filters.page,
  limit: filters.limit,
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.fulfillmentType ? { fulfillmentType: filters.fulfillmentType } : {}),
  ...(filters.orderPlaceId ? { placeId: filters.orderPlaceId } : {}),
});
