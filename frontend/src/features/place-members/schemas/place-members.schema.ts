import { z } from 'zod';

import type { CashierFormValues, SetCashierInput } from '../types/place-members.type';

export const publicUserIdSchema = z
  .string()
  .trim()
  .min(1, 'Enter a public user ID')
  .max(100, 'Use at most 100 characters');

export const cashierAssignmentSchema = z.object({ userId: publicUserIdSchema }).strict();

export const cashierFormValues = (): CashierFormValues => ({ userId: '' });

export const toCashierAssignment = (values: CashierFormValues): { userId: string; input: SetCashierInput } => ({
  userId: cashierAssignmentSchema.parse(values).userId,
  input: { role: 'CASHIER' },
});
