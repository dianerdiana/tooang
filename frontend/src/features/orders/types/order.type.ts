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

export type PublicOrderVerification = {
  orderCode: string;
  placeName: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  createdAt: string;
  expiresAt: string;
  statusUpdatedAt: string;
};

export const ORDER_SOURCE = { CUSTOMER: 'CUSTOMER', MANUAL: 'MANUAL' } as const;
export type OrderSource = (typeof ORDER_SOURCE)[keyof typeof ORDER_SOURCE];

export type OrderSummary = {
  orderId: string;
  orderCode: string;
  source: OrderSource;
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
  createdBy: { userId: string; fullName: string } | null;
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

type CheckoutBaseInput = {
  placeId: string;
  customerName: string;
  customerNote?: string | null;
};

export type CheckoutInput =
  | (CheckoutBaseInput & { fulfillmentType: 'DINE_IN'; tableId: string })
  | (CheckoutBaseInput & { fulfillmentType: 'TAKEAWAY' });

export type CheckoutOrder = {
  orderId: string;
  orderCode: string;
  placeId: string;
  status: 'PENDING';
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerNote: string | null;
  diningTable: { tableId: string; name: string } | null;
  items: OrderItemSnapshot[];
  subtotal: number;
  createdAt: string;
  statusUpdatedAt: string;
  expiresAt: string;
};

export type CheckoutMutationVariables = {
  input: CheckoutInput;
  attempt: {
    idempotencyKey: string;
    fingerprint: string;
  };
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

export type OrderListScope = { kind: 'place'; placeId: string } | { kind: 'platform' } | { kind: 'own' };

export type OrderDetailScope = OrderListScope;

export type ManualOrderLineInput = {
  menuItemId: string;
  quantity: number;
  note?: string | null;
};

type ManualOrderBaseInput = {
  customerName: string;
  customerNote?: string | null;
  items: ManualOrderLineInput[];
};

export type CreateManualOrderInput =
  | (ManualOrderBaseInput & { fulfillmentType: 'DINE_IN'; tableId: string })
  | (ManualOrderBaseInput & { fulfillmentType: 'TAKEAWAY' });

export type ManualOrderOptionItem = {
  menuItemId: string;
  categoryId: string;
  name: string;
  description: string | null;
  type: 'FOOD' | 'DRINK';
  price: number;
  imageUrl: string | null;
};

export type ManualOrderOptions = {
  categories: Array<{
    categoryId: string;
    name: string;
    thumbnailUrl: string | null;
    items: ManualOrderOptionItem[];
  }>;
  tables: Array<{ tableId: string; name: string }>;
};
