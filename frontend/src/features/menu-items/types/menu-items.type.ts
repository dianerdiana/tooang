import type { ApiPaginationMeta } from '@/types/api-response.type';

export type MenuItemType = 'FOOD' | 'DRINK';

export type MenuItem = {
  menuItemId: string;
  placeId: string;
  categoryId: string;
  name: string;
  description: string | null;
  type: MenuItemType;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MenuItemListParams = {
  page?: number;
  limit?: number;
  type?: MenuItemType;
  categoryId?: string;
  isAvailable?: boolean;
};

export type NormalizedMenuItemListParams = Required<Pick<MenuItemListParams, 'page' | 'limit'>> &
  Omit<MenuItemListParams, 'page' | 'limit'>;

export type MenuItemListResult = { items: MenuItem[]; meta: ApiPaginationMeta };

export type CreateMenuItemInput = {
  categoryId: string;
  name: string;
  description?: string | null;
  type: MenuItemType;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
};

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export type MenuItemFormValues = {
  categoryId: string;
  name: string;
  description: string;
  type: MenuItemType;
  price: string;
  isAvailable: boolean;
  sortOrder: string;
};
