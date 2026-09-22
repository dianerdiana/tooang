import type { ApiPaginationMeta } from '@/types/api-response.type';

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const FULFILLMENT_TYPE = {
  DINE_IN: 'DINE_IN',
  TAKEAWAY: 'TAKEAWAY',
} as const;

export type FulfillmentType = (typeof FULFILLMENT_TYPE)[keyof typeof FULFILLMENT_TYPE];

export type OrderSummary = {
  orderId: string;
  orderCode: string;
  place: {
    placeId: string;
    name: string;
  };
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  diningTableName: string | null;
  subtotal: number;
  createdAt: string;
  statusUpdatedAt: string;
  expiresAt: string;
};

export type OrderListParams = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  fulfillmentType?: FulfillmentType;
};

export type OrderListResult = {
  orders: OrderSummary[];
  meta: ApiPaginationMeta;
};

export type OrderListScope = { kind: 'place'; placeId: string } | { kind: 'platform' };
