import {
  createDiningTableSchema,
  normalizeTableName,
  updateDiningTableSchema,
} from './dining-tables.schema';

describe('dining-table schemas', () => {
  it('trims and collapses Unicode whitespace without changing display case', () => {
    expect(normalizeTableName('  VIP\t Table  ')).toBe('VIP Table');
    expect(createDiningTableSchema.parse({ name: '  VIP\t Table  ' })).toEqual({
      name: 'VIP Table',
    });
  });

  it('uses Unicode character counts and rejects empty or oversized names', () => {
    expect(createDiningTableSchema.parse({ name: 'Meja 🍽️' }).name).toBe('Meja 🍽️');
    expect(() => createDiningTableSchema.parse({ name: '   ' })).toThrow();
    expect(() => createDiningTableSchema.parse({ name: 'a'.repeat(31) })).toThrow();
  });

  it('requires a supported update field and rejects protected fields', () => {
    expect(() => updateDiningTableSchema.parse({})).toThrow();
    expect(() => updateDiningTableSchema.parse({ normalizedName: 'private' })).toThrow();
  });
});
