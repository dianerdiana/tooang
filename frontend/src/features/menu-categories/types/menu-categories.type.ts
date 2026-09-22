import type { ApiPaginationMeta } from '@/types/api-response.type';

export type MenuCategory = {
  categoryId: string;
  placeId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuCategoryListParams = {
  page?: number;
  limit?: number;
  isActive?: boolean;
};

export type NormalizedMenuCategoryListParams = {
  page: number;
  limit: number;
  isActive?: boolean;
};

export type MenuCategoryListResult = {
  categories: MenuCategory[];
  meta: ApiPaginationMeta;
};

export type CreateMenuCategoryInput = {
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateMenuCategoryInput = Partial<CreateMenuCategoryInput>;

export type MenuCategoryFormValues = {
  name: string;
  sortOrder: string;
  isActive: boolean;
};
