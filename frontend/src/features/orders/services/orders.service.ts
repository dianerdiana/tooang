import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse, unwrapPaginatedApiResponse } from '@/utils/api-response.util';

import type { ApiPaginatedResponse, ApiResponse } from '@/types/api-response.type';

import { checkoutInputSchema, idempotencyKeySchema } from '../schemas/checkout.schema';
import type {
  CheckoutInput,
  CheckoutOrder,
  CreateManualOrderInput,
  ManualOrderOptions,
  OperationalOrderStatusInput,
  OrderDetail,
  OrderListParams,
  OrderListResult,
  OrderListScope,
  OrderSummary,
  PublicOrderVerification,
} from '../types/order.type';

type OrderListData = {
  orders: OrderSummary[];
};

const listOrders = async (endpoint: string, params: OrderListParams): Promise<OrderListResult> => {
  try {
    const response = await api.get<ApiPaginatedResponse<OrderListData>>(endpoint, { params });
    const result = unwrapPaginatedApiResponse(response.data);

    return {
      orders: result.items.orders,
      meta: result.meta,
    };
  } catch (error) {
    throw toApiError(error);
  }
};

export const ordersService = {
  async getPublicVerification(token: string): Promise<PublicOrderVerification> {
    try {
      const response = await api.get<ApiResponse<{ orderVerification: PublicOrderVerification }>>(
        `/order-verifications/${encodeURIComponent(token)}`,
      );
      const verification = unwrapApiResponse(response.data).orderVerification;
      return {
        orderCode: verification.orderCode,
        placeName: verification.placeName,
        status: verification.status,
        fulfillmentType: verification.fulfillmentType,
        createdAt: verification.createdAt,
        expiresAt: verification.expiresAt,
        statusUpdatedAt: verification.statusUpdatedAt,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async checkout(input: CheckoutInput, idempotencyKey: string): Promise<CheckoutOrder> {
    try {
      const validatedInput = checkoutInputSchema.parse(input);
      const validatedKey = idempotencyKeySchema.parse(idempotencyKey);
      const response = await api.post<CheckoutInput, ApiResponse<{ order: CheckoutOrder }>>(
        '/me/orders',
        validatedInput,
        { headers: { 'Idempotency-Key': validatedKey } },
      );
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  listForPlace(placeId: string, params: OrderListParams) {
    return listOrders(`/places/${placeId}/orders`, params);
  },

  listGlobal(params: OrderListParams) {
    return listOrders('/orders', params);
  },

  list(scope: OrderListScope, params: OrderListParams) {
    const endpoint =
      scope.kind === 'place' ? `/places/${scope.placeId}/orders` : scope.kind === 'own' ? '/me/orders' : '/orders';
    return listOrders(endpoint, params);
  },

  async getOwn(orderId: string): Promise<OrderDetail> {
    try {
      const response = await api.get<ApiResponse<{ order: OrderDetail }>>(`/me/orders/${encodeURIComponent(orderId)}`);
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getForPlace(placeId: string, orderId: string): Promise<OrderDetail> {
    try {
      const response = await api.get<ApiResponse<{ order: OrderDetail }>>(
        `/places/${encodeURIComponent(placeId)}/orders/${encodeURIComponent(orderId)}`,
      );
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getGlobal(orderId: string): Promise<OrderDetail> {
    try {
      const response = await api.get<ApiResponse<{ order: OrderDetail }>>(`/orders/${encodeURIComponent(orderId)}`);
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async transitionForPlace(placeId: string, orderId: string, input: OperationalOrderStatusInput): Promise<OrderDetail> {
    try {
      const response = await api.patch<OperationalOrderStatusInput, ApiResponse<{ order: OrderDetail }>>(
        `/places/${encodeURIComponent(placeId)}/orders/${encodeURIComponent(orderId)}/status`,
        input,
      );
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async transitionOwn(orderId: string, cancellationReason?: string | null): Promise<OrderDetail> {
    try {
      const input = { status: 'CANCELLED' as const, cancellationReason };
      const response = await api.patch<typeof input, ApiResponse<{ order: OrderDetail }>>(
        `/me/orders/${encodeURIComponent(orderId)}/status`,
        input,
      );
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getManualOrderOptions(placeId: string): Promise<ManualOrderOptions> {
    try {
      const response = await api.get<ApiResponse<{ options: ManualOrderOptions }>>(
        `/places/${encodeURIComponent(placeId)}/orders/manual-options`,
      );
      return unwrapApiResponse(response.data).options;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async createManual(placeId: string, input: CreateManualOrderInput, idempotencyKey: string): Promise<OrderDetail> {
    try {
      const response = await api.post<CreateManualOrderInput, ApiResponse<{ order: OrderDetail }>>(
        `/places/${encodeURIComponent(placeId)}/orders/manual`,
        input,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      );
      return unwrapApiResponse(response.data).order;
    } catch (error) {
      throw toApiError(error);
    }
  },
};
