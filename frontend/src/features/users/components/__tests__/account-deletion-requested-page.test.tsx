import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

import { AccountDeletionRequestedPage } from '../account-deletion-requested-page';

describe('account deletion requested page', () => {
  it('renders a generic signed-out pending confirmation without private identity', () => {
    const markup = renderToStaticMarkup(<AccountDeletionRequestedPage />);

    expect(markup).toContain('Account deletion is pending');
    expect(markup).toContain('within 30 days');
    expect(markup).toContain('Discover places');
    expect(markup).not.toContain('sign in');
    expect(markup).not.toMatch(/userId|deletionRequestedAt|email|platformRole/);
  });
});
