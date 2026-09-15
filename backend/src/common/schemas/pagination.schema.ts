import { z } from 'zod';

export const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
} as const;

export const paginationSchema = z.object(paginationFields).strict();

export type PaginationInput = z.infer<typeof paginationSchema>;
