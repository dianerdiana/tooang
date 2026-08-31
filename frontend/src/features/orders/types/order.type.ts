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
  placeId?: string;
};

export type OrderListResult = {
  orders: OrderSummary[];
  meta: ApiPaginationMeta;
};

export type OrderItemSnapshot = {
  menuItemId: string;
  itemName: string;
  itemType: 'FOOD' | 'DRINK';
  unitPrice: number;
  quantity: number;
  note: string | null;
  lineTotal: number;
};

export type OrderDetail = OrderSummary & {
  customerNote: string | null;
  cancellationReason: string | null;
  diningTable: { tableId: string | null; name: string } | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItemSnapshot[];
};

export type OperationalOrderTransitionTarget =
  | typeof ORDER_STATUS.CONFIRMED
  | typeof ORDER_STATUS.PREPARING
  | typeof ORDER_STATUS.READY
  | typeof ORDER_STATUS.COMPLETED
  | typeof ORDER_STATUS.CANCELLED;

export type OperationalOrderStatusInput =
  | { status: Exclude<OperationalOrderTransitionTarget, typeof ORDER_STATUS.CANCELLED> }
  | { status: typeof ORDER_STATUS.CANCELLED; cancellationReason?: string | null };

export type OrderListScope = { kind: 'place'; placeId: string } | { kind: 'platform' };

export type OrderDetailScope = OrderListScope;
