import { z } from 'zod';

import type { FulfillmentType, OrderListParams, OrderStatus } from '../types/order.type';
import { FULFILLMENT_TYPE, ORDER_STATUS } from '../types/order.type';

export const DEFAULT_ORDER_PAGE = 1;
export const DEFAULT_ORDER_LIMIT = 20;

export type OrderQueueSearch = Required<Pick<OrderListParams, 'page' | 'limit'>> & {
  placeId?: string;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
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

const optionalPlaceId = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
  z.string().optional(),
);

export const orderQueueSearchSchema = z
  .object({
    placeId: optionalPlaceId,
    page: positiveInteger(DEFAULT_ORDER_PAGE),
    limit: positiveInteger(DEFAULT_ORDER_LIMIT, 100),
    status: z.enum(ORDER_STATUS).optional().catch(undefined),
    fulfillmentType: z.enum(FULFILLMENT_TYPE).optional().catch(undefined),
  })
  .strip();

export const parseOrderQueueSearch = (search: Record<string, unknown>): OrderQueueSearch =>
  orderQueueSearchSchema.parse(search) as OrderQueueSearch;
