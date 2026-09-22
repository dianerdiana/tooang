import { describe, expect, it } from 'vitest';

import {
  changedMenuCategoryFields,
  normalizeMenuCategoryListParams,
  normalizeMenuCategoryName,
  toCreateMenuCategoryInput,
} from './menu-categories.schema';

const category = {
  categoryId: 'category-1',
  placeId: 'place-1',
  name: 'Main courses',
  sortOrder: 2,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('menu-category schemas', () => {
  it('normalizes whitespace and validates Unicode code-point length', () => {
    expect(normalizeMenuCategoryName('  Main   courses ')).toBe('Main courses');
    expect(toCreateMenuCategoryInput({ name: '😀'.repeat(100), sortOrder: '0', isActive: true }).name).toBe(
      '😀'.repeat(100),
    );
    expect(() => toCreateMenuCategoryInput({ name: '😀'.repeat(101), sortOrder: '0', isActive: true })).toThrow();
  });

  it('accepts only non-negative integer sort orders and documents create defaults', () => {
    expect(toCreateMenuCategoryInput({ name: 'Drinks', sortOrder: '0', isActive: true })).toEqual({
      name: 'Drinks',
      sortOrder: 0,
      isActive: true,
    });
    expect(() => toCreateMenuCategoryInput({ name: 'Drinks', sortOrder: '-1', isActive: true })).toThrow();
    expect(() => toCreateMenuCategoryInput({ name: 'Drinks', sortOrder: '1.5', isActive: true })).toThrow();
  });

  it('returns only changed fields and rejects an unchanged update', () => {
    expect(changedMenuCategoryFields({ name: 'Drinks', sortOrder: '3', isActive: false }, category)).toEqual({
      name: 'Drinks',
      sortOrder: 3,
      isActive: false,
    });
    expect(() =>
      changedMenuCategoryFields({ name: ' Main   courses ', sortOrder: '2', isActive: true }, category),
    ).toThrow();
  });

  it('normalizes pagination to backend limits', () => {
    expect(normalizeMenuCategoryListParams({})).toEqual({ page: 1, limit: 20 });
    expect(normalizeMenuCategoryListParams({ page: 2, limit: 100, isActive: false })).toEqual({
      page: 2,
      limit: 100,
      isActive: false,
    });
    expect(normalizeMenuCategoryListParams({ page: 0, limit: 101 })).toEqual({ page: 1, limit: 20 });
  });
});
