import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import type { PublicMenuCategory, PublicMenuItem } from '../../types/menu-items.type';
import {
  collectPublicMenuCategories,
  collectPublicMenuItems,
  PublicMenuFiltersBar,
  PublicMenuItemCard,
  PublicMenuSkeleton,
} from '../public-menu-page';

const item = (overrides: Partial<PublicMenuItem> = {}): PublicMenuItem => ({
  menuItemId: 'item-1',
  categoryId: 'category-1',
  name: 'Iced tea',
  description: 'Tea with fresh lemon',
  type: 'DRINK',
  price: 12500,
  isAvailable: true,
  sortOrder: 1,
  imageUrl: null,
  ...overrides,
});

const category = (overrides: Partial<PublicMenuCategory> = {}): PublicMenuCategory => ({
  categoryId: 'category-1',
  name: 'Cold drinks',
  sortOrder: 1,
  thumbnailUrl: null,
  items: [item()],
  ...overrides,
});

describe('public menu presentation', () => {
  it('preserves server item order while deduplicating progressive pages', () => {
    const first = category();
    const second = category({
      categoryId: 'category-2',
      name: 'Snacks',
      items: [item({ menuItemId: 'item-2', categoryId: 'category-2', name: 'Toast', type: 'FOOD' })],
    });
    const duplicate = category({ items: [item({ description: 'Repeated page row' })] });

    expect(
      collectPublicMenuItems([{ categories: [first] }, { categories: [second, duplicate] }]).map(
        ({ menuItemId }) => menuItemId,
      ),
    ).toEqual(['item-1', 'item-2']);
    expect(
      collectPublicMenuCategories([{ categories: [first] }, { categories: [second, duplicate] }]).map(
        ({ categoryId }) => categoryId,
      ),
    ).toEqual(['category-1', 'category-2']);
  });

  it('renders image-safe item content, IDR price, details, and add affordance', () => {
    const markup = renderToStaticMarkup(
      <PublicMenuItemCard item={{ ...item(), categoryName: 'Cold drinks' }} orderingEnabled />,
    );

    expect(markup).toContain('Cold drinks · Drinks');
    expect(markup).toContain('Iced tea');
    expect(markup).toContain('Rp');
    expect(markup).toContain('Item details');
    expect(markup).toContain('Add Iced tea to cart');
    expect(markup).toContain('Image unavailable');
  });

  it('marks selected chips and maintains mobile scroll and touch target classes', () => {
    const markup = renderToStaticMarkup(
      <PublicMenuFiltersBar
        categories={[category()]}
        filters={{ type: 'DRINK', categoryId: 'category-1' }}
        onChange={vi.fn()}
      />,
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Cold drinks');
    expect(markup).toContain('min-h-11');
    expect(markup).toContain('overflow-x-auto');
  });

  it('renders stable initial loading geometry', () => {
    const markup = renderToStaticMarkup(<PublicMenuSkeleton />);
    expect(markup).toContain('aria-label="Loading menu"');
    expect(markup).toContain('sm:grid-cols-2');
  });
});
