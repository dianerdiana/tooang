import { describe, expect, it } from 'vitest';

import {
  changedMenuItemFields,
  menuItemPriceSchema,
  normalizeMenuItemListParams,
  toCreateMenuItemInput,
} from './menu-items.schema';

const categoryId = '123e4567-e89b-12d3-a456-426614174000';
const item = {
  menuItemId: 'item-1',
  placeId: 'place-1',
  categoryId,
  name: 'Noodles',
  description: null,
  type: 'FOOD' as const,
  price: 15000.25,
  isAvailable: true,
  sortOrder: 0,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('menu-item schemas', () => {
  it('builds the exact create contract and normalizes optional description', () => {
    expect(
      toCreateMenuItemInput({
        categoryId,
        name: ' Noodles ',
        description: '  ',
        type: 'FOOD',
        price: '15000.25',
        isAvailable: true,
        sortOrder: '0',
      }),
    ).toEqual({
      categoryId,
      name: 'Noodles',
      description: null,
      type: 'FOOD',
      price: 15000.25,
      isAvailable: true,
      sortOrder: 0,
    });
  });

  it.each(['-1', '1.234', 'NaN', '10000000000000'])('rejects unsupported price %s', (price) => {
    expect(() => menuItemPriceSchema.parse(price)).toThrow();
  });

  it('only emits changed fields for updates', () => {
    expect(
      changedMenuItemFields(
        {
          categoryId,
          name: 'Noodles',
          description: '',
          type: 'FOOD',
          price: '16000',
          isAvailable: true,
          sortOrder: '0',
        },
        item,
      ),
    ).toEqual({ price: 16000 });
  });

  it('normalizes only backend-supported filters', () => {
    expect(normalizeMenuItemListParams({ page: 2, limit: 50, type: 'DRINK', categoryId, isAvailable: false })).toEqual({
      page: 2,
      limit: 50,
      type: 'DRINK',
      categoryId,
      isAvailable: false,
    });
  });
});
