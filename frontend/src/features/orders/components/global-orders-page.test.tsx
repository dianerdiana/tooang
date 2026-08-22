import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GlobalOrdersPage } from './global-orders-page';

describe('global orders page', () => {
  it('renders global scope controls without selected-place context', () => {
    const client = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <GlobalOrdersPage filters={{ page: 1, limit: 20 }} onFiltersChange={() => undefined} />
      </QueryClientProvider>,
    );

    expect(markup).toContain('Platform orders');
    expect(markup).toContain('Global order list');
    expect(markup).toContain('Status');
    expect(markup).toContain('Fulfillment');
    expect(markup).toContain('Filter by exact place ID');
    expect(markup).toContain('Loading global orders');
    expect(markup).not.toContain('membership');
  });
});
