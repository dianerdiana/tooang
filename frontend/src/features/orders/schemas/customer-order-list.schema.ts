import { z } from 'zod';

import type { FulfillmentType, OrderListParams, OrderStatus } from '../types/order.type';
import { FULFILLMENT_TYPE, ORDER_STATUS } from '../types/order.type';

import { DEFAULT_ORDER_LIMIT, DEFAULT_ORDER_PAGE } from './order-list.schema';

export type CustomerOrderSearch = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
  placeId?: string;
};

export type NormalizedCustomerOrderSearch = Required<Pick<CustomerOrderSearch, 'page' | 'limit'>> &
  Omit<CustomerOrderSearch, 'page' | 'limit'>;

const optionalPositiveInteger = (maximum?: number) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') return undefined;
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
      return undefined;
    },
    maximum
      ? z.number().int().min(1).max(maximum).optional().catch(undefined)
      : z.number().int().min(1).optional().catch(undefined),
  );

const optionalPlaceId = z
  .preprocess(
    (value) => (typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined),
    z.string().uuid().optional(),
  )
  .catch(undefined);

export const customerOrderSearchSchema = z
  .object({
    page: optionalPositiveInteger(),
    limit: optionalPositiveInteger(100),
    status: z.enum(ORDER_STATUS).optional().catch(undefined),
    fulfillmentType: z.enum(FULFILLMENT_TYPE).optional().catch(undefined),
    placeId: optionalPlaceId,
  })
  .strip();

export const parseCustomerOrderSearch = (search: Record<string, unknown>): CustomerOrderSearch =>
  customerOrderSearchSchema.parse(search) as CustomerOrderSearch;

export const normalizeCustomerOrderSearch = (search: CustomerOrderSearch): NormalizedCustomerOrderSearch => ({
  page: search.page ?? DEFAULT_ORDER_PAGE,
  limit: search.limit ?? DEFAULT_ORDER_LIMIT,
  ...(search.status ? { status: search.status } : {}),
  ...(search.fulfillmentType ? { fulfillmentType: search.fulfillmentType } : {}),
  ...(search.placeId ? { placeId: search.placeId } : {}),
});

export const compactCustomerOrderSearch = (search: NormalizedCustomerOrderSearch): CustomerOrderSearch => ({
  ...(search.page !== DEFAULT_ORDER_PAGE ? { page: search.page } : {}),
  ...(search.limit !== DEFAULT_ORDER_LIMIT ? { limit: search.limit } : {}),
  ...(search.status ? { status: search.status } : {}),
  ...(search.fulfillmentType ? { fulfillmentType: search.fulfillmentType } : {}),
  ...(search.placeId ? { placeId: search.placeId } : {}),
});

export const customerOrderSearchToListParams = (search: NormalizedCustomerOrderSearch): OrderListParams => ({
  page: search.page,
  limit: search.limit,
  ...(search.status ? { status: search.status } : {}),
  ...(search.fulfillmentType ? { fulfillmentType: search.fulfillmentType } : {}),
  ...(search.placeId ? { placeId: search.placeId } : {}),
});

export const isValidCustomerOrderPlaceId = (value: string) =>
  value.trim() === '' || z.string().uuid().safeParse(value.trim()).success;
