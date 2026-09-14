import { z } from 'zod';

const unicodeLength = (value: string) => Array.from(value).length;

export function normalizeTableName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

const tableNameSchema = z
  .string()
  .transform(normalizeTableName)
  .refine((value) => unicodeLength(value) >= 1, 'Must contain at least 1 character')
  .refine((value) => unicodeLength(value) <= 30, 'Must contain at most 30 characters');

export const diningTableParamSchema = z
  .object({ placeId: z.string().uuid(), tableId: z.string().uuid() })
  .strict();
export const createDiningTableSchema = z.object({ name: tableNameSchema }).strict();
export const updateDiningTableSchema = z
  .object({ name: tableNameSchema.optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: 'At least one supported field is required',
  });

export type DiningTableParam = z.infer<typeof diningTableParamSchema>;
export type CreateDiningTableInput = z.infer<typeof createDiningTableSchema>;
export type UpdateDiningTableInput = z.infer<typeof updateDiningTableSchema>;
