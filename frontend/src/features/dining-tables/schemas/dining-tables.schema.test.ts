import { describe, expect, it } from 'vitest';

import {
  changedDiningTableFields,
  createDiningTableSchema,
  normalizeDiningTableName,
  updateDiningTableSchema,
} from './dining-tables.schema';

const table = {
  tableId: 'table-1',
  placeId: 'place-1',
  name: 'Patio 1',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('dining-table validation', () => {
  it('trims and collapses name whitespace', () => {
    expect(normalizeDiningTableName('  Main   Hall \n 1 ')).toBe('Main Hall 1');
    expect(createDiningTableSchema.parse({ name: '  Main   Hall ' })).toEqual({ name: 'Main Hall' });
  });

  it('enforces a 1-30 Unicode code-point display length', () => {
    expect(createDiningTableSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createDiningTableSchema.safeParse({ name: '😀'.repeat(30) }).success).toBe(true);
    expect(createDiningTableSchema.safeParse({ name: '😀'.repeat(31) }).success).toBe(false);
  });

  it('requires at least one update and returns only changed fields', () => {
    expect(updateDiningTableSchema.safeParse({}).success).toBe(false);
    expect(changedDiningTableFields({ name: 'Patio 2' }, table, false)).toEqual({
      name: 'Patio 2',
      isActive: false,
    });
    expect(() => changedDiningTableFields({ name: ' Patio   1 ' }, table, true)).toThrow();
  });
});
