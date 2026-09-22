import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ItemDetail } from './menu-items-panel';

const item = {
  menuItemId: 'item-1',
  placeId: 'place-1',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Iced tea',
  description: 'Cold tea',
  type: 'DRINK' as const,
  price: 5000,
  isAvailable: true,
  sortOrder: 2,
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const categories = [
  {
    categoryId: item.categoryId,
    placeId: 'place-1',
    name: 'Drinks',
    sortOrder: 0,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
];

const renderDetail = (permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <ItemDetail
        placeId='place-1'
        item={item}
        categories={categories}
        permissions={permissions}
        onDeleted={() => undefined}
      />
    </QueryClientProvider>,
  );

describe('menu-item controls', () => {
  it('renders every field in the backend mutation contract', () => {
    const markup = renderDetail({ canCreate: false, canUpdate: true, canDelete: false });
    expect(markup).toContain('Item name');
    expect(markup).toContain('Category');
    expect(markup).toContain('Type');
    expect(markup).toContain('Price (IDR)');
    expect(markup).toContain('Description');
    expect(markup).toContain('Sort order');
    expect(markup).toContain('Available');
  });

  it('gates update and confirmed delete actions independently', () => {
    const readOnly = renderDetail({ canCreate: false, canUpdate: false, canDelete: false });
    const deleteOnly = renderDetail({ canCreate: false, canUpdate: false, canDelete: true });
    expect(readOnly).not.toContain('Save changes');
    expect(readOnly).not.toContain('Delete menu item');
    expect(deleteOnly).toContain('Delete');
    expect(deleteOnly).not.toContain('Save changes');
  });
});
