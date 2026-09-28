import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import { CUSTOMER_STATE_PRESENTATIONS } from '@/utils/customer-state-presentation';

import { CustomerDataState, CustomerStateBanner } from '../customer-state';

describe('customer data-state composition', () => {
  it('uses a structural skeleton only for an initial load without data', () => {
    const markup = renderToStaticMarkup(
      <CustomerDataState isInitialLoading hasData={false}>
        Current content
      </CustomerDataState>,
    );
    expect(markup).toContain('aria-label="Loading content"');
    expect(markup).not.toContain('Current content');
  });

  it('distinguishes first-use empty from filtered no-results', () => {
    const empty = renderToStaticMarkup(
      <CustomerDataState isInitialLoading={false} hasData={false} emptyKind='empty' emptyTitle='No orders yet'>
        Content
      </CustomerDataState>,
    );
    const noResults = renderToStaticMarkup(
      <CustomerDataState isInitialLoading={false} hasData={false} emptyKind='no-results'>
        Content
      </CustomerDataState>,
    );
    expect(empty).toContain('No orders yet');
    expect(noResults).toContain('No matching results');
    expect(noResults).not.toContain('No orders yet');
  });

  it('preserves stale data and adds a persistent refresh warning', () => {
    const markup = renderToStaticMarkup(
      <CustomerDataState
        isInitialLoading={false}
        hasData
        error={{ error: true, code: 'ERR_NETWORK', message: 'raw', isNetworkError: true }}
        onRecoveryAction={vi.fn()}
      >
        Existing safe content
      </CustomerDataState>,
    );
    expect(markup).toContain('Existing safe content');
    expect(markup).toContain('Could not refresh this content');
    expect(markup).not.toContain('raw');
  });

  it('shows an unobtrusive updating status without replacing current data', () => {
    const markup = renderToStaticMarkup(
      <CustomerDataState isInitialLoading={false} hasData isRefreshing>
        Existing safe content
      </CustomerDataState>,
    );
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Updating current information');
    expect(markup).toContain('Existing safe content');
  });

  it('renders persistent business blockers as banners with recovery actions', () => {
    const markup = renderToStaticMarkup(
      <CustomerStateBanner presentation={CUSTOMER_STATE_PRESENTATIONS.reconciledCart} onAction={vi.fn()} />,
    );
    expect(markup).toContain('Cart updated');
    expect(markup).toContain('Review cart');
    expect(markup).toContain('role="status"');
  });
});
