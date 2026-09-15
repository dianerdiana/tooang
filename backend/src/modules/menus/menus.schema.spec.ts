import {
  createCategorySchema,
  createMenuItemSchema,
  listCategoriesSchema,
  menuPriceSchema,
  normalizeCategoryName,
  updateCategorySchema,
  updateMenuItemSchema,
} from './menus.schema';

describe('menu schemas', () => {
  it('normalizes category names and applies create defaults', () => {
    expect(normalizeCategoryName('  Hot   Drinks\nToday ')).toBe('Hot Drinks Today');
    expect(createCategorySchema.parse({ name: '  Hot   Drinks ' })).toEqual({
      name: 'Hot Drinks',
      sortOrder: 0,
      isActive: true,
    });
  });

  it('enforces Unicode category bounds, non-negative order, strict bodies, and non-empty patches', () => {
    expect(createCategorySchema.safeParse({ name: '😀'.repeat(100), sortOrder: 0 }).success).toBe(
      true,
    );
    expect(createCategorySchema.safeParse({ name: '😀'.repeat(101) }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: 'Food', sortOrder: -1 }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: 'Food', description: 'hidden' }).success).toBe(
      false,
    );
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
  });

  it('parses bounded boolean pagination filters without truthy string coercion', () => {
    expect(listCategoriesSchema.parse({ isActive: 'false' }).isActive).toBe(false);
    expect(listCategoriesSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts only finite, non-negative Decimal(15,2) prices', () => {
    for (const value of [0, 12.34, 9_999_999_999_999.99]) {
      expect(menuPriceSchema.safeParse(value).success).toBe(true);
    }
    for (const value of [-1, 1.001, Infinity, 10_000_000_000_000]) {
      expect(menuPriceSchema.safeParse(value).success).toBe(false);
    }
  });

  it('normalizes nullable descriptions and rejects protected item fields', () => {
    const parsed = createMenuItemSchema.parse({
      categoryId: '11111111-1111-4111-8111-111111111111',
      name: '  Noodles  ',
      description: '   ',
      type: 'FOOD',
      price: 15_000,
    });
    expect(parsed).toEqual(expect.objectContaining({ name: 'Noodles', description: null }));
    expect(updateMenuItemSchema.safeParse({}).success).toBe(false);
    expect(updateMenuItemSchema.safeParse({ imageAssetId: 'x' }).success).toBe(false);
    expect(updateMenuItemSchema.safeParse({ price: 1, placeId: 'x' }).success).toBe(false);
  });
});
