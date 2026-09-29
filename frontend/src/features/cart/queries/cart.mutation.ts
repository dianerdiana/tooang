import { type QueryClient, useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query';

import { publicMenuKeys } from '@/features/menu-items/queries/menu-items.query';

import { isApplicationError } from '@/utils/api-error.util';

import { cartUuidSchema } from '../schemas/cart.schema';
import { cartService } from '../services/cart.service';
import type { AddCartItemInput, Cart, UpdateCartItemInput } from '../types/cart.type';

import { cartKeys } from './cart.query';

export const cartMutationKeys = {
  item: (placeId: string, menuItemId: string) =>
    ['cart', 'mutation', 'place', cartUuidSchema.parse(placeId), 'item', cartUuidSchema.parse(menuItemId)] as const,
};

export const replaceCartCache = (client: QueryClient, requestedPlaceId: string, cart: Cart) => {
  const placeId = cartUuidSchema.parse(requestedPlaceId);
  if (cart.placeId !== placeId) throw new Error('Cart response did not match the requested place');
  client.setQueryData(cartKeys.place(placeId), cart);
};

export const invalidateCartAfterMutationError = async (client: QueryClient, placeId: string, error: unknown) => {
  const normalizedPlaceId = cartUuidSchema.parse(placeId);
  const work: Promise<unknown>[] = [
    client.invalidateQueries({ queryKey: cartKeys.place(normalizedPlaceId), exact: true }),
  ];
  if (isApplicationError(error) && (error.code === 'MENU_ITEM_UNAVAILABLE' || error.httpStatus === 404)) {
    work.push(client.invalidateQueries({ queryKey: publicMenuKeys.place(normalizedPlaceId) }));
  }
  await Promise.all(work);
};

export const useCartItemPending = (placeId: string, menuItemId: string) =>
  useIsMutating({ mutationKey: cartMutationKeys.item(placeId, menuItemId), exact: true }) > 0;

export const useAddCartItemMutation = (placeId: string, menuItemId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKeys.item(placeId, menuItemId),
    mutationFn: (input: Omit<AddCartItemInput, 'menuItemId'>) => cartService.add(placeId, { ...input, menuItemId }),
    onSuccess: (cart) => replaceCartCache(client, placeId, cart),
    onError: (error) => invalidateCartAfterMutationError(client, placeId, error),
  });
};

export const useUpdateCartItemMutation = (placeId: string, menuItemId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKeys.item(placeId, menuItemId),
    mutationFn: (input: UpdateCartItemInput) => cartService.update(placeId, menuItemId, input),
    onSuccess: (cart) => replaceCartCache(client, placeId, cart),
    onError: (error) => invalidateCartAfterMutationError(client, placeId, error),
  });
};

export const useRemoveCartItemMutation = (placeId: string, menuItemId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationKey: cartMutationKeys.item(placeId, menuItemId),
    mutationFn: () => cartService.remove(placeId, menuItemId),
    onSuccess: (cart) => replaceCartCache(client, placeId, cart),
    onError: (error) => invalidateCartAfterMutationError(client, placeId, error),
  });
};
