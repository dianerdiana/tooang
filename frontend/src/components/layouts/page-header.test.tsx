import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  it('renders the current breadcrumb and page heading semantics', () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        breadcrumbs={[{ id: 'current', label: 'Settings' }]}
        title='Place settings'
        description='Update this place.'
      />,
    );

    expect(markup).toContain('aria-label="Breadcrumb"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('<h1');
    expect(markup).toContain('Place settings');
  });

  it('omits breadcrumb navigation when no items are provided', () => {
    const markup = renderToStaticMarkup(<PageHeader title='Overview' />);

    expect(markup).not.toContain('aria-label="Breadcrumb"');
  });
});
