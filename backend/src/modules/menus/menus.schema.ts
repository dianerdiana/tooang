import { z } from 'zod';

import { MenuItemType, Prisma } from '@/generated/prisma/client';

const unicodeLength = (value: string) => Array.from(value).length;

export const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/gu, ' ');

const categoryName = z
  .string()
  .transform(normalizeCategoryName)
  .refine((value) => unicodeLength(value) >= 1, 'Name is required')
  .refine((value) => unicodeLength(value) <= 100, 'Name must contain at most 100 characters');

const menuItemName = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => unicodeLength(value) >= 1, 'Name is required')
  .refine((value) => unicodeLength(value) <= 120, 'Name must contain at most 120 characters');

const description = z
  .union([z.string(), z.null()])
  .transform((value) => (typeof value === 'string' ? value.trim() || null : null))
  .refine(
    (value) => value === null || unicodeLength(value) <= 1000,
    'Description must contain at most 1000 characters',
  );

export const menuPriceSchema = z
  .number()
  .finite()
  .min(0)
  .max(9_999_999_999_999.99)
  .refine((value) => new Prisma.Decimal(value.toString()).decimalPlaces() <= 2, {
    message: 'Price must have at most two fractional digits',
  });

const booleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true'));

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const categoryParamSchema = z
  .object({ placeId: z.string().uuid(), categoryId: z.string().uuid() })
  .strict();
export const menuItemParamSchema = z
  .object({ placeId: z.string().uuid(), menuItemId: z.string().uuid() })
  .strict();

export const listCategoriesSchema = z
  .object({ ...pagination, isActive: booleanQuery.optional() })
  .strict();
export const createCategorySchema = z
  .object({
    name: categoryName,
    sortOrder: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export const updateCategorySchema = z
  .object({
    name: categoryName.optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one supported field is required');

export const listMenuItemsSchema = z
  .object({
    ...pagination,
    type: z.enum(MenuItemType).optional(),
    categoryId: z.string().uuid().optional(),
    isAvailable: booleanQuery.optional(),
  })
  .strict();
export const publicMenuSchema = listMenuItemsSchema.omit({ isAvailable: true });

export const createMenuItemSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: menuItemName,
    description: description.optional(),
    type: z.enum(MenuItemType),
    price: menuPriceSchema,
    isAvailable: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();
export const updateMenuItemSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    name: menuItemName.optional(),
    description: description.optional(),
    type: z.enum(MenuItemType).optional(),
    price: menuPriceSchema.optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one supported field is required');

export type CategoryParam = z.infer<typeof categoryParamSchema>;
export type MenuItemParam = z.infer<typeof menuItemParamSchema>;
export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListMenuItemsInput = z.infer<typeof listMenuItemsSchema>;
export type PublicMenuInput = z.infer<typeof publicMenuSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
