import { z } from 'zod';

import type {
  CreateMenuItemInput,
  MenuItem,
  MenuItemFormValues,
  MenuItemListParams,
  NormalizedMenuItemListParams,
  UpdateMenuItemInput,
} from '../types/menu-items.type';

const unicodeLength = (value: string) => Array.from(value).length;

export const menuItemNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => unicodeLength(value) >= 1, 'Enter an item name')
  .refine((value) => unicodeLength(value) <= 120, 'Use at most 120 characters');

export const menuItemDescriptionSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => unicodeLength(value) <= 1000, 'Use at most 1,000 characters')
  .transform((value) => value || null);

export const menuItemPriceSchema = z
  .string()
  .trim()
  .min(1, 'Enter a price')
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Use a non-negative amount with at most two decimal places')
  .refine((value) => Number.isFinite(Number(value)), 'Enter a valid price')
  .refine((value) => Number(value) <= 9_999_999_999_999.99, 'Price is above the supported maximum')
  .transform(Number);

export const menuItemSortOrderSchema = z
  .string()
  .regex(/^\d+$/, 'Use a non-negative whole number')
  .transform(Number)
  .pipe(z.number().int().min(0, 'Sort order cannot be negative'));

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().uuid('Select a category'),
    name: menuItemNameSchema,
    description: z.string().nullable().optional(),
    type: z.enum(['FOOD', 'DRINK']),
    price: z.number().finite().min(0).max(9_999_999_999_999.99),
    isAvailable: z.boolean(),
    sortOrder: z.number().int().min(0),
  })
  .strict();

export const updateMenuItemSchema = createMenuItemSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Change at least one field');

export const normalizeMenuItemListParams = (params: MenuItemListParams): NormalizedMenuItemListParams => ({
  page: Number.isInteger(params.page) && (params.page ?? 0) >= 1 ? params.page! : 1,
  limit: Number.isInteger(params.limit) && (params.limit ?? 0) >= 1 && (params.limit ?? 0) <= 100 ? params.limit! : 20,
  ...(params.type === 'FOOD' || params.type === 'DRINK' ? { type: params.type } : {}),
  ...(params.categoryId ? { categoryId: params.categoryId } : {}),
  ...(typeof params.isAvailable === 'boolean' ? { isAvailable: params.isAvailable } : {}),
});

export const menuItemToFormValues = (item?: MenuItem): MenuItemFormValues => ({
  categoryId: item?.categoryId ?? '',
  name: item?.name ?? '',
  description: item?.description ?? '',
  type: item?.type ?? 'FOOD',
  price: item ? String(item.price) : '',
  isAvailable: item?.isAvailable ?? true,
  sortOrder: String(item?.sortOrder ?? 0),
});

export const toCreateMenuItemInput = (values: MenuItemFormValues): CreateMenuItemInput =>
  createMenuItemSchema.parse({
    categoryId: values.categoryId,
    name: menuItemNameSchema.parse(values.name),
    description: menuItemDescriptionSchema.parse(values.description),
    type: values.type,
    price: menuItemPriceSchema.parse(values.price),
    isAvailable: values.isAvailable,
    sortOrder: menuItemSortOrderSchema.parse(values.sortOrder),
  });

export const changedMenuItemFields = (values: MenuItemFormValues, item: MenuItem): UpdateMenuItemInput => {
  const parsed = toCreateMenuItemInput(values);
  return updateMenuItemSchema.parse({
    ...(parsed.categoryId === item.categoryId ? {} : { categoryId: parsed.categoryId }),
    ...(parsed.name === item.name ? {} : { name: parsed.name }),
    ...(parsed.description === item.description ? {} : { description: parsed.description }),
    ...(parsed.type === item.type ? {} : { type: parsed.type }),
    ...(String(parsed.price) === String(item.price) ? {} : { price: parsed.price }),
    ...(parsed.isAvailable === item.isAvailable ? {} : { isAvailable: parsed.isAvailable }),
    ...(parsed.sortOrder === item.sortOrder ? {} : { sortOrder: parsed.sortOrder }),
  });
};
