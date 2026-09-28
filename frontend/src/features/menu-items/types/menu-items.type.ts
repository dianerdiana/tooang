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

export type PublicMenuItem = {
  menuItemId: string;
  categoryId: string;
  name: string;
  description: string | null;
  type: MenuItemType;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  imageUrl: string | null;
};

export type PublicMenuCategory = {
  categoryId: string;
  name: string;
  sortOrder: number;
  thumbnailUrl: string | null;
  items: PublicMenuItem[];
};

export type PublicMenuListParams = {
  page?: number;
  limit?: number;
  type?: MenuItemType;
  categoryId?: string;
};

export type NormalizedPublicMenuListParams = Required<Pick<PublicMenuListParams, 'page' | 'limit'>> &
  Omit<PublicMenuListParams, 'page' | 'limit'>;

export type PublicMenuPaginationMeta = Required<
  Pick<ApiPaginationMeta, 'page' | 'limit' | 'totalItems' | 'totalPages'>
>;

export type PublicMenuListResult = {
  categories: PublicMenuCategory[];
  meta: PublicMenuPaginationMeta;
};

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
