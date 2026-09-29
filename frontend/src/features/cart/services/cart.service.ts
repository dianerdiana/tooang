import { api } from '@/configs/api-config';

import { toApiError } from '@/utils/api-error.util';
import { unwrapApiResponse } from '@/utils/api-response.util';

import type { ApiResponse } from '@/types/api-response.type';

import { addCartItemSchema, cartUuidSchema, parseCart, updateCartItemSchema } from '../schemas/cart.schema';
import type { AddCartItemInput, Cart, UpdateCartItemInput } from '../types/cart.type';

const cartPath = (placeId: string) => `/me/carts/${encodeURIComponent(cartUuidSchema.parse(placeId))}`;
const itemPath = (placeId: string, menuItemId: string) =>
  `${cartPath(placeId)}/items/${encodeURIComponent(cartUuidSchema.parse(menuItemId))}`;

const unwrapCart = (response: ApiResponse<{ cart: unknown }>, placeId: string): Cart =>
  parseCart(unwrapApiResponse(response).cart, placeId);

export const cartService = {
  async get(placeId: string): Promise<Cart> {
    try {
      const response = await api.get<ApiResponse<{ cart: unknown }>>(cartPath(placeId));
      return unwrapCart(response.data, placeId);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async add(placeId: string, input: AddCartItemInput): Promise<Cart> {
    try {
      const body = addCartItemSchema.parse(input);
      const response = await api.post<typeof body, ApiResponse<{ cart: unknown }>>(`${cartPath(placeId)}/items`, body);
      return unwrapCart(response.data, placeId);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(placeId: string, menuItemId: string, input: UpdateCartItemInput): Promise<Cart> {
    try {
      const body = updateCartItemSchema.parse(input);
      const response = await api.patch<typeof body, ApiResponse<{ cart: unknown }>>(
        itemPath(placeId, menuItemId),
        body,
      );
      return unwrapCart(response.data, placeId);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(placeId: string, menuItemId: string): Promise<Cart> {
    try {
      const response = await api.delete<ApiResponse<{ cart: unknown }>>(itemPath(placeId, menuItemId));
      return unwrapCart(response.data, placeId);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
