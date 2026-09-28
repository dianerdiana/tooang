import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { isRedirect } from '@tanstack/react-router';

import { CustomerShell } from '@/components/layouts/customer-shell';
import { PublicShell } from '@/components/layouts/public-shell';

import type { AuthenticatedUser } from '@/types/user-data.type';

import { Route as CustomerRoute } from './_customer';
import { Route as PublicRoute } from './_public';
import { Route as LoginRoute } from './login';
import { Route as RegisterRoute } from './register';

function runCustomerBeforeLoad(isAuthenticated: boolean, user: AuthenticatedUser | null, href = '/orders') {
  try {
    CustomerRoute.options.beforeLoad?.({
      context: { auth: { isAuthenticated, isInitialLoading: false, user } },
      location: { href, pathname: href.split('?')[0] },
    } as never);
    return null;
  } catch (error) {
    return error;
  }
}

describe('public and customer route boundaries', () => {
  it('keeps the public boundary authentication-neutral', () => {
    expect(PublicRoute.options.beforeLoad).toBeUndefined();
  });

  it('keeps auth-entry routes outside both layout boundaries', () => {
    expect(LoginRoute.options.beforeLoad).toBeTypeOf('function');
    expect(RegisterRoute.options.beforeLoad).toBeTypeOf('function');
    expect(LoginRoute.options.component).not.toBe(PublicRoute.options.component);
    expect(LoginRoute.options.component).not.toBe(CustomerRoute.options.component);
  });

  it.each([LoginRoute, RegisterRoute])('returns authenticated auth-entry visitors to their safe flow', (route) => {
    let result: unknown;
    try {
      route.options.beforeLoad?.({
        context: { auth: { isAuthenticated: true, isInitialLoading: false, user: {} as AuthenticatedUser } },
        search: { redirect: '/orders' },
      } as never);
    } catch (error) {
      result = error;
    }

    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) expect(result.options).toMatchObject({ href: '/orders' });
  });

  it('guards the customer boundary and preserves a safe deep link', () => {
    const result = runCustomerBeforeLoad(false, null, '/orders?status=READY');
    expect(isRedirect(result)).toBe(true);
    if (isRedirect(result)) {
      expect(result.options).toMatchObject({
        to: '/login',
        search: { redirect: '/orders?status=READY' },
      });
    }
  });

  it('allows an authenticated customer and defines a shell-preserving error boundary', () => {
    expect(runCustomerBeforeLoad(true, {} as AuthenticatedUser)).toBeNull();
    expect(CustomerRoute.options.errorComponent).toBeTypeOf('function');
  });

  it('renders stable header, main, and footer landmarks for the public shell', () => {
    const markup = renderToStaticMarkup(
      <PublicShell navigation={<header>Navigation</header>}>Public content</PublicShell>,
    );
    expect(markup).toContain('<header');
    expect(markup).toContain('<main');
    expect(markup).toContain('<footer');
    expect(markup).toContain('id="main-content"');
  });

  it('renders a distinct customer shell without the dashboard sidebar', () => {
    const markup = renderToStaticMarkup(
      <CustomerShell navigation={<header>Navigation</header>}>Customer content</CustomerShell>,
    );
    expect(markup).toContain('<header');
    expect(markup).toContain('<main');
    expect(markup).not.toContain('sidebar');
  });
});
