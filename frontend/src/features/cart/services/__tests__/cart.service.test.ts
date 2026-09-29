import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({ delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('@/configs/api-config', () => ({ api: apiMock }));

import { cartService } from '../cart.service';

const placeId = '5d2b73e0-84f0-4f8c-a3e8-733e7b8312ae';
const menuItemId = '123e4567-e89b-42d3-a456-426614174000';
const emptyCart = {
  cartId: null,
  placeId,
  distinctItemCount: 0,
  aggregateQuantity: 0,
  items: [],
  removedItems: [],
};
const success = (cart = emptyCart) => ({ data: { error: false, message: 'Success', data: { cart } } });

describe('cartService', () => {
  beforeEach(() => Object.values(apiMock).forEach((mock) => mock.mockReset()));

  it('uses exact place-scoped endpoints and supported request shapes', async () => {
    apiMock.get.mockResolvedValueOnce(success());
    apiMock.post.mockResolvedValueOnce(success());
    apiMock.patch.mockResolvedValueOnce(success());
    apiMock.delete.mockResolvedValueOnce(success());

    await expect(cartService.get(placeId.toUpperCase())).resolves.toEqual(emptyCart);
    await cartService.add(placeId, { menuItemId, quantity: 2, note: '  Mild  ' });
    await cartService.update(placeId, menuItemId, { quantity: 0 });
    await cartService.remove(placeId, menuItemId);

    expect(apiMock.get).toHaveBeenCalledWith(`/me/carts/${placeId}`);
    expect(apiMock.post).toHaveBeenCalledWith(`/me/carts/${placeId}/items`, {
      menuItemId,
      quantity: 2,
      note: 'Mild',
    });
    expect(apiMock.patch).toHaveBeenCalledWith(`/me/carts/${placeId}/items/${menuItemId}`, { quantity: 0 });
    expect(apiMock.delete).toHaveBeenCalledWith(`/me/carts/${placeId}/items/${menuItemId}`);
  });

  it('rejects a response from another place instead of contaminating its cache', async () => {
    apiMock.get.mockResolvedValueOnce(success({ ...emptyCart, placeId: '8f95e179-a74f-46e0-aea8-e796a297c667' }));
    await expect(cartService.get(placeId)).rejects.toMatchObject({ code: 'APPLICATION_ERROR' });
  });

  it.each([
    ['NOT_FOUND', 'Cart not found', 404],
    ['CART_CONCURRENT_MODIFICATION', 'Cart changed concurrently', 409],
  ])('normalizes %s errors', async (code, message, httpStatus) => {
    apiMock.get.mockRejectedValueOnce({ error: true, code, message, httpStatus, isNetworkError: false });
    await expect(cartService.get(placeId)).rejects.toMatchObject({
      code,
      message,
      httpStatus,
      isNetworkError: false,
    });
  });
});
