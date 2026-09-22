import { z } from 'zod';

import type {
  CreateMenuCategoryInput,
  MenuCategory,
  MenuCategoryFormValues,
  MenuCategoryListParams,
  NormalizedMenuCategoryListParams,
  UpdateMenuCategoryInput,
} from '../types/menu-categories.type';

const unicodeLength = (value: string) => Array.from(value).length;

export const normalizeMenuCategoryName = (value: string) => value.trim().replace(/\s+/gu, ' ');

export const menuCategoryNameSchema = z
  .string()
  .transform(normalizeMenuCategoryName)
  .refine((value) => unicodeLength(value) >= 1, 'Enter a category name')
  .refine((value) => unicodeLength(value) <= 100, 'Use at most 100 characters');

export const menuCategorySortOrderSchema = z
  .string()
  .regex(/^\d+$/, 'Use a non-negative whole number')
  .transform(Number)
  .pipe(z.number().int().min(0, 'Sort order cannot be negative'));

export const createMenuCategorySchema = z
  .object({
    name: menuCategoryNameSchema,
    sortOrder: z.number().int().min(0),
    isActive: z.boolean(),
  })
  .strict();

export const updateMenuCategorySchema = createMenuCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Change at least one field');

export const normalizeMenuCategoryListParams = (params: MenuCategoryListParams): NormalizedMenuCategoryListParams => ({
  page: Number.isInteger(params.page) && (params.page ?? 0) >= 1 ? params.page! : 1,
  limit: Number.isInteger(params.limit) && (params.limit ?? 0) >= 1 && (params.limit ?? 0) <= 100 ? params.limit! : 20,
  ...(typeof params.isActive === 'boolean' ? { isActive: params.isActive } : {}),
});

export const menuCategoryToFormValues = (category?: MenuCategory): MenuCategoryFormValues => ({
  name: category?.name ?? '',
  sortOrder: String(category?.sortOrder ?? 0),
  isActive: category?.isActive ?? true,
});

export const toCreateMenuCategoryInput = (values: MenuCategoryFormValues): CreateMenuCategoryInput =>
  createMenuCategorySchema.parse({
    name: menuCategoryNameSchema.parse(values.name),
    sortOrder: menuCategorySortOrderSchema.parse(values.sortOrder),
    isActive: values.isActive,
  });

export const changedMenuCategoryFields = (
  values: MenuCategoryFormValues,
  category: MenuCategory,
): UpdateMenuCategoryInput => {
  const parsed = toCreateMenuCategoryInput(values);
  return updateMenuCategorySchema.parse({
    ...(parsed.name === category.name ? {} : { name: parsed.name }),
    ...(parsed.sortOrder === category.sortOrder ? {} : { sortOrder: parsed.sortOrder }),
    ...(parsed.isActive === category.isActive ? {} : { isActive: parsed.isActive }),
  });
};
