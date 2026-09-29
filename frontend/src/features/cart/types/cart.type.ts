import type { MenuItemType } from '@/features/menu-items/types/menu-items.type';

export type CartRemovedItemReason = 'ITEM_DELETED' | 'ITEM_UNAVAILABLE' | 'CATEGORY_DELETED' | 'CATEGORY_INACTIVE';

export type CartItemCategory = {
  categoryId: string;
  name: string;
};

export type CartItem = {
  menuItemId: string;
  name: string;
  type: MenuItemType;
  category: CartItemCategory;
  unitPrice: number;
  quantity: number;
  note: string | null;
};

export type RemovedCartItem = {
  menuItemId: string;
  reason: CartRemovedItemReason;
};

export type Cart = {
  cartId: string | null;
  placeId: string;
  distinctItemCount: number;
  aggregateQuantity: number;
  items: CartItem[];
  removedItems: RemovedCartItem[];
};

export type AddCartItemInput = {
  menuItemId: string;
  quantity?: number;
  note?: string | null;
};

export type UpdateCartItemInput = {
  quantity?: number;
  note?: string | null;
};
