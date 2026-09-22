import { z } from 'zod';

import type {
  CreateDiningTableInput,
  DiningTable,
  DiningTableFormValues,
  UpdateDiningTableInput,
} from '../types/dining-tables.type';

const unicodeLength = (value: string) => Array.from(value).length;

export const normalizeDiningTableName = (value: string) => value.trim().replace(/\s+/gu, ' ');

export const diningTableNameSchema = z
  .string()
  .transform(normalizeDiningTableName)
  .refine((value) => unicodeLength(value) >= 1, 'Enter a table name')
  .refine((value) => unicodeLength(value) <= 30, 'Use at most 30 characters');

export const createDiningTableSchema = z.object({ name: diningTableNameSchema }).strict();

export const updateDiningTableSchema = z
  .object({ name: diningTableNameSchema.optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: 'Change at least one field',
  });

export const diningTableToFormValues = (table?: DiningTable): DiningTableFormValues => ({
  name: table?.name ?? '',
});

export const toCreateDiningTableInput = (values: DiningTableFormValues): CreateDiningTableInput =>
  createDiningTableSchema.parse(values);

export const changedDiningTableFields = (
  values: DiningTableFormValues,
  table: DiningTable,
  isActive: boolean,
): UpdateDiningTableInput => {
  const name = diningTableNameSchema.parse(values.name);
  return updateDiningTableSchema.parse({
    ...(name === table.name ? {} : { name }),
    ...(isActive === table.isActive ? {} : { isActive }),
  });
};
