import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CategoryDetail } from './menu-categories-page';

const category = {
  categoryId: 'category-1',
  placeId: 'place-1',
  name: 'Drinks',
  sortOrder: 4,
  isActive: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderDetail = (permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <CategoryDetail placeId='place-1' category={category} permissions={permissions} onDeleted={() => undefined} />
    </QueryClientProvider>,
  );

describe('menu-category controls', () => {
  it('renders only documented category fields', () => {
    const markup = renderDetail({ canCreate: false, canUpdate: true, canDelete: false });
    expect(markup).toContain('Category name');
    expect(markup).toContain('Sort order');
    expect(markup).toContain('Inactive');
    expect(markup).not.toContain('Description');
    expect(markup).not.toContain('Menu item');
  });

  it('gates update and delete independently', () => {
    const readOnly = renderDetail({ canCreate: false, canUpdate: false, canDelete: false });
    const deleteOnly = renderDetail({ canCreate: false, canUpdate: false, canDelete: true });
    expect(readOnly).not.toContain('Save changes');
    expect(readOnly).not.toContain('Delete category');
    expect(deleteOnly).not.toContain('Save changes');
    expect(deleteOnly).toContain('Delete');
  });

  it('describes the documented soft-delete conflict', () => {
    const markup = renderDetail({ canCreate: false, canUpdate: true, canDelete: true });
    expect(markup).toContain('soft-deleted');
    expect(markup).toContain('without menu items');
  });
});
