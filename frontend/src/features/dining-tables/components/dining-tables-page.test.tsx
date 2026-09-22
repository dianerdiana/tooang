import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { DiningTable } from '../types/dining-tables.type';

import { DiningTableDetail, DiningTablesTable } from './dining-tables-page';

const table: DiningTable = {
  tableId: 'table-1',
  placeId: 'place-1',
  name: 'Main Hall',
  isActive: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const renderDetail = (permissions: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <DiningTableDetail placeId='place-1' table={table} permissions={permissions} onDeleted={() => undefined} />
    </QueryClientProvider>,
  );

describe('dining-table management UI', () => {
  it('renders backend identifiers and active state without pagination', () => {
    const markup = renderToStaticMarkup(<DiningTablesTable tables={[table]} onOpen={() => undefined} />);
    expect(markup).toContain('Main Hall');
    expect(markup).toContain('table-1');
    expect(markup).toContain('Inactive');
    expect(markup).not.toContain('pagination');
  });

  it('preserves a read-only detail for users without mutation permissions', () => {
    const markup = renderDetail({ canCreate: false, canUpdate: false, canDelete: false });
    expect(markup).toContain('Read-only access');
    expect(markup).not.toContain('Save changes');
    expect(markup).not.toContain('Delete table');
  });

  it('gates update and delete controls independently', () => {
    const updateOnly = renderDetail({ canCreate: false, canUpdate: true, canDelete: false });
    const deleteOnly = renderDetail({ canCreate: false, canUpdate: false, canDelete: true });
    expect(updateOnly).toContain('Save changes');
    expect(updateOnly).not.toContain('Delete table');
    expect(deleteOnly).not.toContain('Save changes');
    expect(deleteOnly).toContain('Delete');
  });
});
